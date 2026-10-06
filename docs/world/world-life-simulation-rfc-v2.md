# World Life Simulation RFC v2

## Статус документа
- Версия: `v2`
- Дата: `2026-04-19`
- Область: автономная симуляция жизни мира на глобальной карте (NPC, монстры, фракции, деревни, конфликты)
- Цель: зафиксировать контракт данных, видимость для Player/Developer, и пошаговые алгоритмы боевых/захватных событий

---

## 1) Контекст и цели

Этот RFC описывает второй этап симуляции «живого мира», где события происходят даже без прямого участия игрока:
- отряды NPC и монстров передвигаются по миру,
- фракции инициируют столкновения,
- деревни подвергаются рейдам,
- территории могут перейти под контроль атакующей стороны,
- все события логируются для диагностики в `World Info`.

Ключевая цель v2 — сделать поведение мира объяснимым, детерминируемым по тикам и проверяемым через UI.

### Как проверить вручную в UI
1. Запустить игру в режиме разработчика.
2. Открыть глобальную карту и панель `World Info`.
3. Ускорить время (или промотать сутки) и убедиться, что меняются активные конфликты, позиции групп и статусы деревень.
4. Сверить журнал событий с текущими состояниями сущностей.

### Какие поля отображаются в World Info на этом этапе
- `worldTimeHours`, `worldTickId`
- `activeConflictsCount`
- `factionSummary[]`
- `villageSummary[]`
- `npcGroupsSummary[]`
- `monsterGroupsSummary[]`
- `lastWorldEvents[]`

---

## 2) Сущности и контракты состояния

Ниже перечислены обязательные состояния для подсистемы симуляции.

### 2.1 `WorldSimulationState`

```ts
type WorldSimulationState = {
  worldTickId: number;
  worldTimeHours: number;
  lastUpdateIso: string;

  npcs: Record<string, NpcState>;
  monsters: Record<string, MonsterState>;
  factions: Record<string, FactionState>;
  villages: Record<string, VillageState>;
  activeConflicts: Record<string, ActiveConflictState>;

  worldEventLog: WorldEvent[];
  simulationConfig: {
    tickHours: number;            // шаг симуляции, например 1 час
    villageCaptureNoDefenseHours: number; // фикс: 24
    maxEventLogSize: number;
  };
};
```

Инварианты:
- `worldTickId` всегда монотонно увеличивается.
- Любая ссылка на `factionId`, `villageId`, `npcId`, `monsterId` указывает на существующую сущность.
- `activeConflicts` содержит только незавершённые конфликты.

### 2.2 `NpcState`

```ts
type NpcState = {
  npcId: string;
  displayName: string;

  factionId: string;
  role: 'scout' | 'warrior' | 'captain' | 'messenger' | 'villager-guard';

  currentNodeId: string;
  destinationNodeId: string | null;
  routeNodeIds: string[];

  hp: number;
  maxHp: number;
  attackPower: number;
  defensePower: number;
  speedCellsPerHour: number;

  isAlive: boolean;
  isInConflictId: string | null;
  aggression: number; // 0..100
  detectionRadius: number;

  inventoryTags: string[];
  lastActionAtTick: number;
};
```

### 2.3 `MonsterState`

```ts
type MonsterState = {
  monsterId: string;
  speciesId: string;
  threatTier: 1 | 2 | 3 | 4 | 5;

  factionId: string; // обычно monster/*

  currentNodeId: string;
  destinationNodeId: string | null;
  routeNodeIds: string[];

  hp: number;
  maxHp: number;
  attackPower: number;
  defensePower: number;
  speedCellsPerHour: number;

  isAlive: boolean;
  isInConflictId: string | null;
  aggression: number; // выше среднего у агрессивных видов
  detectionRadius: number;

  behaviorProfile: 'territorial' | 'raider' | 'hunter' | 'migratory';
  lastActionAtTick: number;
};
```

### 2.4 `FactionState`

```ts
type FactionState = {
  factionId: string;
  displayName: string;

  ideologyTag: string;
  hostilityMatrix: Record<string, number>; // -100..100

  controlledVillageIds: string[];
  militaryPowerScore: number;
  economyScore: number;

  diplomacyFlags: string[];
  aiStance: 'expansion' | 'defense' | 'trade' | 'retaliation';

  knownEnemyFactionIds: string[];
  lastStrategicUpdateTick: number;
};
```

### 2.5 `VillageState`

```ts
type VillageState = {
  villageId: string;
  displayName: string;
  nodeId: string;

  ownerFactionId: string;
  population: number;
  guardPower: number;

  prosperity: number; // 0..100
  fearLevel: number; // 0..100
  supplyDays: number;

  underAttackByFactionId: string | null;
  underAttackSinceTick: number | null;

  captureProgressHours: number;
  lastRaidAtTick: number | null;

  tags: string[];
};
```

### 2.6 `ActiveConflictState`

```ts
type ActiveConflictState = {
  conflictId: string;
  type: 'intercept' | 'battle' | 'village-raid' | 'village-siege';

  attackerFactionId: string;
  defenderFactionId: string;

  attackerUnitIds: string[];
  defenderUnitIds: string[];

  locationNodeId: string;
  startedAtTick: number;
  lastResolvedAtTick: number;

  status: 'active' | 'resolved-attacker-win' | 'resolved-defender-win' | 'resolved-withdraw';
  intensity: number; // 0..100

  villageId: string | null; // заполнено для village-* конфликтов
  metadata: Record<string, string | number | boolean>;
};
```

### Как проверить вручную в UI
1. Открыть `World Info` и убедиться, что по каждой сущности показываются ключевые поля (ID, позиция, фракция, боевые параметры, статус).
2. Пролистать несколько тиков и проверить, что `lastActionAtTick`, `worldTickId`, `startedAtTick` обновляются последовательно.
3. Проверить, что при смерти юнита (`isAlive=false`) он исчезает из активных участников конфликтов.

### Какие поля отображаются в World Info на этом этапе
- `WorldSimulationState`: `worldTickId`, `worldTimeHours`, `activeConflictsCount`, `eventLogSize`
- `NpcState`: `npcId`, `factionId`, `currentNodeId`, `hp/maxHp`, `isInConflictId`, `isAlive`
- `MonsterState`: `monsterId`, `speciesId`, `threatTier`, `currentNodeId`, `hp/maxHp`, `behaviorProfile`
- `FactionState`: `factionId`, `controlledVillageIds`, `militaryPowerScore`, `aiStance`
- `VillageState`: `villageId`, `ownerFactionId`, `guardPower`, `underAttackByFactionId`, `captureProgressHours`
- `ActiveConflictState`: `conflictId`, `type`, `attackerFactionId`, `defenderFactionId`, `status`, `locationNodeId`

---

## 3) Режимы видимости

В v2 фиксируются два режима отображения данных:

### 3.1 Player mode (ограниченный)
Игрок видит только:
- события в радиусе разведки/присутствия персонажа;
- итоговые последствия для известных деревень (например, «деревня разграблена»),
- обобщённые слухи без точных внутренних чисел.

Игрок **не видит**:
- полные `hostilityMatrix`,
- точный состав каждого удалённого отряда,
- скрытые технические поля (`metadata`, внутренние ID событий).

### 3.2 Developer mode (полный через World Info)
Разработчик видит:
- полный снимок `WorldSimulationState`,
- все сущности в т.ч. вне видимости игрока,
- весь стек активных конфликтов,
- внутренние числа, таймеры, коэффициенты, историю шагов.

### 3.3 Правила переключения
- Режим определяется флагом developer mode.
- Все расчёты общие; различается только сериализация/рендер данных в UI.
- Переключение режима не сбрасывает состояние симуляции.

### Как проверить вручную в UI
1. Отключить developer mode и открыть карту: убедиться, что видна только ограниченная информация.
2. Включить developer mode и снова открыть `World Info`.
3. Сверить, что появились расширенные поля, скрытые ID, внутренние тайминги конфликтов.
4. Переключить режим несколько раз: убедиться, что симуляция не перезапускается.

### Какие поля отображаются в World Info на этом этапе
- В Player режиме: `visibleEvents[]`, `knownVillageStatus[]`, `rumorFeed[]`.
- В Developer режиме: полный dump `WorldSimulationState` + диагностические поля `resolutionTrace[]`, `combatRolls[]`, `interceptChecks[]`.

---

## 4) Алгоритмы симуляции: атака, перехват, бой

### 4.1 Общий порядок тика
Для каждого `worldTickId`:
1. Обновить перемещение всех юнитов (`NpcState`, `MonsterState`).
2. Выполнить проверки обнаружения врага (`detectionRadius` + враждебность фракций).
3. Создать события перехвата при выполнении условий.
4. Разрешить активные бои.
5. Обновить деревни под атакой и прогресс захвата.
6. Записать события в `worldEventLog`.

### 4.2 Алгоритм атаки
Условия начала атаки:
- у стороны есть цель (враждебный юнит или деревня),
- существует маршрут до цели,
- `aggression` и `aiStance` допускают нападение.

Схема:
- выбрать цель по приоритетам: угроза > близость > ценность цели;
- назначить атакующую группу;
- пометить intent в `metadata` конфликта/плана;
- перейти к фазе движения или немедленного контакта.

### 4.3 Алгоритм перехвата
Перехват возникает, если:
- отряды враждебных фракций пересекают радиусы обнаружения,
- хотя бы одна сторона выбирает engage вместо retreat.

Формула вероятности перехвата (примерная, нормированная):
`P = clamp(0..1, base + visionAdvantage + speedAdvantage + terrainModifier - stealthPenalty)`

Если перехват успешен:
- создаётся `ActiveConflictState(type='intercept')`,
- обе стороны получают `isInConflictId=conflictId`,
- движение на текущем тике останавливается.

### 4.4 Алгоритм боя
Бой разрешается дискретно по тикам.

Для каждой стороны вычисляется эффективная сила:
`effectivePower = sum((attackPower * hpRatio) + defensePower * 0.35) * moraleModifier * terrainModifier`

Результат тика боя:
- проигравшая сторона получает потери,
- возможен `withdraw` при падении морали/HP ниже порога,
- при обнулении боеспособности конфликт закрывается победой второй стороны.

Постусловия:
- обновить `status`,
- освободить `isInConflictId` у выживших,
- записать итоги в `worldEventLog`.

### Как проверить вручную в UI
1. Создать сценарий, где два враждебных отряда идут по пересекающимся маршрутам.
2. Проверить появление `intercept` конфликта в `World Info`.
3. Промотать время и убедиться, что конфликт переходит в `battle`/`resolved-*`.
4. Проверить корректность потерь и освобождение `isInConflictId` после завершения.

### Какие поля отображаются в World Info на этом этапе
- `interceptChecks[]`: участвующие группы, итоговая вероятность, результат
- `activeConflicts[]`: `type`, `status`, `intensity`, `startedAtTick`, `lastResolvedAtTick`
- `unitCombatSnapshot[]`: `hp`, `effectivePower`, `morale`, `withdrawFlag`
- `worldEventLog[]`: события `INTERCEPT_STARTED`, `BATTLE_TICK`, `BATTLE_RESOLVED`

---

## 5) Алгоритмы захвата и нападений на деревни

### 5.1 Нападение на деревню
Триггеры нападения:
- деревня принадлежит враждебной фракции,
- атакующая сторона имеет численное/силовое превосходство или агрессивную стратегию,
- маршрут до `village.nodeId` доступен.

После входа атакующих в узел деревни:
- `underAttackByFactionId` заполняется,
- фиксируется `underAttackSinceTick`,
- создаётся `ActiveConflictState(type='village-raid' | 'village-siege')`.

### 5.2 Оборона деревни
Сила обороны:
- `guardPower` + вклад дружественных юнитов в узле,
- модификаторы от `supplyDays`, `fearLevel`, укреплений (если есть тег).

Если оборона успешна:
- прогресс захвата сбрасывается,
- атакующие отступают или погибают,
- деревня получает флаг «выстояла» в журнале.

### 5.3 Захват за 24 часа без обороны
Фиксированное правило v2:
- если в деревне нет эффективной обороны (`effectiveDefense <= threshold`) непрерывно,
- то через `24` часа игрового времени деревня автоматически меняет владельца.

Формально:
- `captureProgressHours += tickHours`, пока нет обороны,
- при `captureProgressHours >= 24`:
  - `ownerFactionId = attackerFactionId`,
  - `captureProgressHours = 0`,
  - `underAttackByFactionId = null`,
  - `underAttackSinceTick = null`,
  - завершить осадный конфликт статусом `resolved-attacker-win`.

Если оборона появилась до 24 часов:
- прогресс либо замораживается, либо откатывается со скоростью восстановления (настраиваемо),
- автоматический захват не происходит.

### 5.4 Последствия захвата
- обновить `FactionState.controlledVillageIds` у обеих фракций,
- пересчитать `militaryPowerScore` и экономические показатели,
- сгенерировать world-события: смена контроля, миграция населения, изменение страха/процветания.

### Как проверить вручную в UI
1. Инициировать нападение на деревню без гарнизона.
2. Ускорить время ровно на 24 игровых часа и проверить смену `ownerFactionId`.
3. Повторить сценарий, добавив защитников до истечения 24 часов.
4. Убедиться, что автозахват отменяется/останавливается, а прогресс обновляется по правилам.
5. Проверить журнал событий и изменение сводок фракций.

### Какие поля отображаются в World Info на этом этапе
- `villageState`: `ownerFactionId`, `underAttackByFactionId`, `underAttackSinceTick`, `captureProgressHours`, `guardPower`
- `villageDefenseSnapshot`: `effectiveDefense`, `defenseThreshold`, `reinforcementsEta`
- `activeConflicts[]` для village-событий: `type`, `status`, `attackerFactionId`, `defenderFactionId`, `villageId`
- `factionSummary[]`: список контролируемых деревень до/после тика
- `worldEventLog[]`: `VILLAGE_ATTACK_STARTED`, `VILLAGE_CAPTURE_PROGRESS`, `VILLAGE_CAPTURED`, `VILLAGE_DEFENDED`

---

## 6) Набор проверок и критерии готовности

Минимальные критерии для приёмки v2:
- Все 6 сущностей присутствуют в состоянии и сериализуются без потерь.
- Player/Developer режимы отображают разные уровни детализации.
- Перехват и бой воспроизводимы на повторном прогоне при одинаковом seed.
- Автозахват деревни за 24 часа без обороны стабильно срабатывает.
- Любой ключевой шаг отражается в `worldEventLog` и в `World Info`.

### Как проверить вручную в UI
1. Пройти checklist по всем блокам 2–5.
2. Сохранить 2–3 скриншота `World Info` (до боя, во время боя, после захвата).
3. Сравнить фактические состояния с ожидаемыми инвариантами RFC.

### Какие поля отображаются в World Info на этом этапе
- `validationChecklistStatus`
- `determinismSeed`
- `recentAssertionResults[]`
- `eventConsistencyCounters`

---

## 7) Риски и заметки внедрения

- Риск перегрузки UI при полном dump состояния в Developer mode: нужен лимит/виртуализация списков.
- Риск «снежного кома» конфликтов при слишком агрессивных фракциях: требуется балансировочный cap на число одновременных атак.
- Риск рассинхронизации между логикой и отображением: обязательна единая схема DTO для `World Info`.
- Для отладки рекомендуется фиксировать `determinismSeed` и сохранять трассу последних N тиков.

### Как проверить вручную в UI
1. Включить Developer mode в поздней игре (много сущностей).
2. Проверить отзывчивость панели `World Info`.
3. Убедиться, что при фильтрации/пагинации данные не теряются и не дублируются.

### Какие поля отображаются в World Info на этом этапе
- `uiPerf`: `renderMs`, `rowsRendered`, `virtualizationEnabled`
- `simulationHealth`: `activeUnits`, `activeConflicts`, `eventsPerTick`
- `debugFilters`: текущие фильтры и лимиты вывода
