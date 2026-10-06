# RGFN Expandable Content Architecture Vision (2026-03-31)

## Why this document exists

This vision focuses on the fastest-growing RGFN content categories and defines a target architecture that makes adding new content cheap, safe, and repeatable.

Primary expansion categories:

- monsters
- encounter/event types
- quest templates
- weapon and item types
- locations (including future cave/instance style spaces)
- spells
- skills/stats
- terrain types
- HUD/UI panels
- factions
- acts (Diablo-style biome progression)
- battle map objects

The design goal is **maximum content extensibility with minimal migration cost from the current codebase**.

---

## Current baseline (what we already have and should reuse)

RGFN already has useful foundations we should preserve:

- A composition root and orchestration layer (`GameFacade` + factory/runtime coordinators).
- Typed domains for many systems (quest, encounter, HUD, world map, magic).
- Existing explicit unions that already represent content categories (for example encounter type unions, terrain unions, panel unions).
- Existing quest generation flow and spell composition flow.

This means we can avoid a rewrite and instead introduce a **content module contract layer** that current systems gradually adopt.

---

## Target architecture in one sentence

Adopt a **Registry + Contract + Runtime Context** architecture:

1. each expandable category has a clear contract/interface,
2. each category has a registry that discovers and validates content modules,
3. systems consume registries through narrow ports,
4. old hardcoded paths continue to work during migration via adapters.

---

## Core design principles

1. **Data-first content, logic-by-exception**
   - Prefer declarative definitions (JSON/TS objects) for common content.
   - Use logic classes/functions only when behavior cannot be expressed declaratively.

2. **Category contracts are explicit and stable**
   - Every content family has an `I*Definition` or `I*Template` contract.
   - Runtime systems only depend on contracts, not concrete files.

3. **Registries are the single source of truth**
   - No distributed ad-hoc arrays of content in random files.
   - Content lookup happens via registry API (by id/tag/weight/act/faction/etc).

4. **Composable runtime context**
   - Template logic receives a narrow context object (`GameContext`, `QuestContext`, etc.) rather than direct access to all systems.

5. **Compatibility first**
   - Keep legacy hardcoded content operational while incrementally moving each category to registries.

6. **Fail-fast validation**
   - Content validation runs at startup/tests: duplicate ids, unknown refs, circular deps, invalid weights, missing assets.

---

## Shared framework to implement once

Create a shared framework under `rgfn_game/js/content/` used by all categories.

### 1) Generic content contracts

- `ContentId` (string alias)
- `ContentTags` (`string[]`)
- `ContentOrigin` (core/mod/test/generated)
- `ContentDefinitionBase`:
  - `id`, `name`, `version`, `tags`, `enabledByDefault`, `actIds`, optional `factionIds`

### 2) Generic registry contracts

- `IContentRegistry<TDef>`:
  - `register(def: TDef)`
  - `registerMany(defs: TDef[])`
  - `getById(id: string)`
  - `list()`
  - `query(filter)`
  - `validate()`

- `WeightedSelector<TDef>` helper for encounter, loot, spawn, quest weighting.

### 3) Content loading pipeline

- Static core content loader (current built-in content).
- Optional external pack loader (future data packs/mods).
- Validation/report object with warnings/errors.

### 4) Runtime context ports

- `IWorldPort`, `ICombatPort`, `IInventoryPort`, `IQuestPort`, `IEventBusPort`
- Context objects expose only needed methods to templates/definitions.

### 5) Event schema for cross-system events

- canonical typed events such as:
  - `monster.killed`
  - `quest.started`
  - `quest.completed`
  - `location.entered`
  - `faction.reputation.changed`

---

## Category-by-category target contracts

## A) Monsters

### Contract

`IMonsterDefinition`:

- identity: `id`, `name`, `species`, `actIds`, optional `factionIds`
- stats profile: base stats, scaling profile, resistances
- behavior profile: AI archetype id, skill usage hints
- spawn profile: biome tags, encounter weights, min/max party size
- loot profile: loot table ids
- visuals: sprite/animation keys

`IMonsterFactory` creates runtime combat entities from `IMonsterDefinition` + difficulty context.

### Migration from current state

- Keep `Skeleton` runtime behavior as reference implementation.
- Extract current enemy type weight table into monster registry metadata.
- Replace hardcoded ordered enemy list in encounter rolling with registry query.

---

## B) Encounter / random event types

### Contract

`IEncounterTypeDefinition`:

- `id`, `kind` (`monster`, `item`, `traveler`, future kinds)
- trigger constraints (world mode only, terrain filters, act/faction filters)
- weight strategy
- `resolve(context): EncounterResult`

### Migration from current state

- Current random encounter unions map directly into first definitions.
- `EncounterResolver` becomes dispatcher over registered encounter type definitions.
- Developer toggles become registry-level enable/disable flags.

---

## C) Quest templates

### Contract

`IQuestTemplate`:

- metadata: `id`, `name`, `category`, `actIds`, difficulty tier
- `canGenerate(ctx): boolean`
- `generate(ctx): QuestNode | QuestGraph`
- `onProgressEvent(ctx, event): ProgressDelta`
- `onComplete(ctx): CompletionOutcome`
- `onFail?(ctx): FailureOutcome`

### Migration from current state

- Wrap current generator patterns as template implementations.
- Existing objective handlers (`deliver`, monster progress, traversal, trade) become reusable progress processors.
- Quest UI remains mostly unchanged; it consumes normalized quest runtime state.

---

## D) Weapons and items

### Contract

`IItemTypeDefinition` and `IWeaponTypeDefinition`:

- base identity and rarity
- equip/use rules
- stat/effect modifiers
- generation tags and drop weights
- optional scripted hooks for rare edge behavior

### Migration from current state

- Keep `ItemDeclarations` entries as seed definitions.
- Move discovery/equip behavior lookups to item registry.
- Preserve current inventory systems and adapt lookup APIs first.

---

## E) Locations and instances

### Contract

`ILocationTypeDefinition`:

- `id`, `name`, `kind` (`village`, `dock`, `cave`, `instance`, etc.)
- placement constraints by terrain/act
- enter/exit rules
- available interactions/services
- encounter/environment modifiers

`IInstanceTemplate` for Diablo-like generated cave spaces:

- topology generator id
- enemy pool ids
- reward table ids
- objective/exit conditions

### Migration from current state

- Existing villages/docks become first location definitions.
- World map generation asks location registry for what can spawn.
- Future caves can be added without touching core world map controller flow.

---

## F) Spells

### Contract

Keep current `Spell` + `SpellEffect` contracts, extend into registry-based module model:

- `ISpellDefinition`: metadata + effect stack + progression path
- `ISpellEffectDefinition`: reusable effect components
- `ISpellProgressionDefinition`: level scaling and unlock requirements

### Migration from current state

- Convert static spell book builder list into registry registration.
- Keep current effect classes (`MagicDamageEffect`, `SlowEffect`, etc.) intact.
- HUD spell rendering reads spell registry rather than fixed button assumptions.

---

## G) Skills and stats

### Contract

`IStatDefinition`:

- id/name/category
- bounds/default
- derived formula hooks
- UI formatting hints

`ISkillDefinition`:

- governing stat links
- scaling formulas
- unlock dependencies

### Migration from current state

- Existing fixed six-skill model becomes initial registry entries.
- Derived stat formulas are centralized in one formula service using stat definitions.
- This unlocks adding new skills/stats without touching every entity file.

---

## H) Terrain types

### Contract

`ITerrainTypeDefinition`:

- id/display name
- traversal rules
- generation noise profile
- visual renderer pattern key
- encounter modifiers

### Migration from current state

- Current terrain unions (`grass`, `forest`, etc.) map to first definition set.
- World map generation/rendering asks terrain registry for parameters.
- Add desert/other acts by adding definitions and act biome profiles.

---

## I) HUD panels

### Contract

`IHudPanelDefinition`:

- id/title/icon
- mount point
- visibility rules by game mode
- render/update handlers
- hotkey and toggle metadata

### Migration from current state

- Existing hardcoded panel toggles become panel definitions.
- `HudPanelStateController` becomes registry-driven.
- New panels can be inserted without broad changes to event binder code.

---

## J) Factions

### Contract

`IFactionDefinition`:

- id/name/ideology
- relation matrix to other factions
- join requirements
- reputation bands and perks/penalties
- event hooks

`IFactionSimulationRule` (for future live simulation):

- periodic world updates (conflict, control, diplomacy)

### Migration approach

- Introduce faction registry now, even before full simulation.
- Start with passive factions referenced by quests/locations/encounters.
- Later add simulation engine consuming the same definitions.

---

## K) Acts

### Contract

`IActDefinition`:

- id/name/order
- biome profile ids
- location pool ids
- quest pool ids
- encounter modifiers
- progression gating and transition rules

### Migration from current state

- Current world effectively equals Act 1 (forest).
- Add act registry and tag current content with `actIds: ['act1_forest']`.
- Future desert act becomes additive content, not system rewrite.

---

## L) Battle map objects

### Contract

`IBattleMapObjectDefinition`:

- id/type (obstacle, trap, interactable, cover)
- placement rules
- traversal/LOS modifiers
- optional interaction behavior hooks

### Migration from current state

- Current obstacle generation and map object handling become first adapters.
- Enables adding traps/interactables without inflating battle map core.

---

## Repository structure target (minimal disruption)

```text
rgfn_game/js/
  content/
    core/
      ContentRegistry.ts
      ContentValidation.ts
      WeightedSelector.ts
      RuntimePorts.ts
    monsters/
      MonsterContracts.ts
      MonsterRegistry.ts
      MonsterCoreDefinitions.ts
    encounters/
      EncounterContracts.ts
      EncounterRegistry.ts
      EncounterCoreDefinitions.ts
    quests/
      QuestTemplateContracts.ts
      QuestTemplateRegistry.ts
      QuestTemplateCoreDefinitions.ts
    items/
      ItemContracts.ts
      ItemRegistry.ts
      ItemCoreDefinitions.ts
    locations/
      LocationContracts.ts
      LocationRegistry.ts
      LocationCoreDefinitions.ts
    spells/
      SpellContracts.ts
      SpellRegistry.ts
      SpellCoreDefinitions.ts
    stats/
      StatContracts.ts
      StatRegistry.ts
      StatCoreDefinitions.ts
    terrain/
      TerrainContracts.ts
      TerrainRegistry.ts
      TerrainCoreDefinitions.ts
    hud/
      HudPanelContracts.ts
      HudPanelRegistry.ts
      HudPanelCoreDefinitions.ts
    factions/
      FactionContracts.ts
      FactionRegistry.ts
      FactionCoreDefinitions.ts
    acts/
      ActContracts.ts
      ActRegistry.ts
      ActCoreDefinitions.ts
    battleMapObjects/
      BattleMapObjectContracts.ts
      BattleMapObjectRegistry.ts
      BattleMapObjectCoreDefinitions.ts
```

Notes:

- Existing systems stay where they are.
- New `content/` layer is additive and consumed via adapters.
- This minimizes merge risk and avoids large move-only refactors.

---

## Migration strategy (ordered for lowest risk)

1. Build shared content core (`ContentRegistry`, validation, runtime ports).
2. Migrate easiest category first: spells (already interface-driven).
3. Migrate encounters next (high leverage, currently hardcoded type flow).
4. Migrate items/weapons.
5. Migrate terrain + locations + acts together (world generation dependencies).
6. Migrate monsters after encounter/location contracts exist.
7. Migrate quest templates (highest surface area, but now with stable references).
8. Migrate HUD panels to registry.
9. Add factions contracts and passive integration.
10. Add live faction simulation and richer acts/instances.

At each step:

- keep compatibility adapter
- run focused tests + full suite
- document newly introduced boundary in `docs/refactors/`

---

## Non-goals (important)

- Not a rewrite of rendering engine.
- Not a switch to external plugin/mod loading on day one.
- Not mandatory ECS migration.
- Not changing gameplay balance during architecture extraction unless required.

---

## Definition of done for this architecture vision

The architecture is considered achieved when:

1. Each expansion-heavy category has a stable contract and registry.
2. New content in those categories is added mostly by definition files and small glue code.
3. Core orchestrators/controllers no longer require edits for most content additions.
4. Startup/test validation catches content errors before runtime.
5. Act/faction/location/encounter growth is additive and does not increase cross-file boilerplate linearly.

---

## Recommended documentation and tooling additions

1. `docs/content-authoring/` mini-guides per category (monster, quest, spell, location, etc.).
2. A `scripts/content-validate.ts` CI check.
3. A `scripts/content-report.ts` generator producing inventory of registered content.
4. PR template section: “Content category touched + registry validation output”.
5. Optional future skill: “RGFN Content Module Creator” that scaffolds definitions + tests for a new content entry.

