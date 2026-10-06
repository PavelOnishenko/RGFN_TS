import test from 'node:test';
import assert from 'node:assert/strict';

import GameQuestRuntime from '../../dist/game/runtime/GameQuestRuntime.js';
import QuestProgressTracker from '../../dist/systems/quest/QuestProgressTracker.js';

function createRecoverQuest() {
  return {
    id: 'main',
    title: 'Main',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'main.1',
        title: 'Recover Torva',
        description: 'Retrieve Torva from Thalthalira Harbor.',
        conditionText: 'Obtain Torva at Thalthalira Harbor.',
        objectiveType: 'recover',
        entities: [
          { text: 'Torva', type: 'item' },
          { text: 'Thalthalira Harbor', type: 'location' },
        ],
        objectiveData: {
          recover: {
            itemName: 'Torva',
            personName: 'Ilyan',
            initialVillage: 'Thalthalira Harbor',
            currentVillage: 'Thalthalira Harbor',
            isPersonKnown: false,
            hasFled: false,
          },
        },
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
  };
}

function createQuestWithKnownAndUnknownContracts() {
  return {
    id: 'main',
    title: 'Main',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'barter-complete',
        title: 'Completed barter',
        description: '',
        conditionText: '',
        objectiveType: 'barter',
        entities: [{ text: 'Olive', type: 'person' }, { text: 'Kator Kaesh', type: 'item' }],
        children: [],
        isCompleted: true,
      },
      {
        id: 'escort-active',
        title: 'Active escort',
        description: '',
        conditionText: '',
        objectiveType: 'escort',
        entities: [{ text: 'Bram', type: 'person' }, { text: 'Farwatch', type: 'location' }],
        objectiveData: { escort: { personName: 'Bram', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' } },
        children: [],
        isCompleted: false,
      },
      {
        id: 'future-deliver',
        title: 'Future delivery',
        description: '',
        conditionText: '',
        objectiveType: 'deliver',
        entities: [],
        objectiveData: { deliver: { sourceTrader: 'Cora', itemName: 'Void Relic', sourceVillage: 'Silent Reach', destinationVillage: 'North Cross' } },
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
  };
}

function createKnownDefendQuest() {
  return {
    id: 'main',
    title: 'Main',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'defend-active',
        title: 'Defend Heights Gate',
        description: '',
        conditionText: '',
        objectiveType: 'defend',
        entities: [
          { text: 'Heights Gate', type: 'location' },
          { text: 'Quinn Evans', type: 'person' },
        ],
        objectiveData: {
          defend: {
            villageName: 'Heights Gate',
            artifactName: 'Allies Coverage',
            contactName: 'Quinn Evans',
            durationDays: 3,
            timeRemainingMinutes: 4320,
            isDefenseActive: false,
            defenders: [],
            fallenDefenderNames: [],
          },
        },
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
  };
}

function createSideQuestWithLocation(id = 'side-1', locationName = 'Silver Ridge') {
  return {
    id,
    title: 'Recover artifact',
    description: `Retrieve the relic from ${locationName}.`,
    conditionText: `Obtain the relic at ${locationName}.`,
    objectiveType: 'recover',
    entities: [{ text: locationName, type: 'location' }],
    children: [],
    isCompleted: false,
    track: 'side',
    status: 'active',
    giverNpcName: 'Ysolde',
    giverVillageName: locationName,
  };
}

function createSideQuest(overrides = {}) {
  return {
    id: 'side-1',
    title: 'Find Lost Satchel',
    description: 'Retrieve a satchel from the old road.',
    conditionText: 'Return with the satchel.',
    objectiveType: 'scout',
    entities: [],
    children: [],
    track: 'side',
    giverNpcName: 'Mira',
    giverVillageName: 'Ashford',
    reward: '18g',
    rewardMetadata: { xp: 18, gold: 18, itemName: 'Scout Charm', requiresTurnIn: true },
    status: 'available',
    ...overrides,
  };
}

function createActiveScoutSideQuest(overrides = {}) {
  return {
    id: 'side-scout',
    title: 'Scout Golden Beacon',
    description: 'Travel to Golden Beacon and secure the path.',
    conditionText: 'Complete the listed task and return to the quest giver.',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'side-scout.1',
        title: 'Scout Golden Beacon',
        description: 'Travel to Golden Beacon and secure the path.',
        conditionText: 'Enter Golden Beacon.',
        objectiveType: 'scout',
        entities: [{ text: 'Golden Beacon', type: 'location' }],
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
    track: 'side',
    giverNpcName: 'Rica',
    giverVillageName: 'Selzen',
    status: 'active',
    ...overrides,
  };
}

function createActiveRecoverSideQuest(overrides = {}) {
  return {
    id: 'side-recover',
    title: 'Recover Torlys Eshlor',
    description: 'Retrieve Torlys Eshlor from Golden Beacon.',
    conditionText: 'Obtain Torlys Eshlor at Golden Beacon.',
    objectiveType: 'recover',
    entities: [{ text: 'Torlys Eshlor', type: 'item' }, { text: 'Golden Beacon', type: 'location' }],
    objectiveData: {
      recover: {
        itemName: 'Torlys Eshlor',
        personName: 'Unknown',
        initialVillage: 'Golden Beacon',
        currentVillage: 'Golden Beacon',
        isPersonKnown: false,
        hasFled: false,
      },
    },
    children: [],
    isCompleted: false,
    track: 'side',
    giverNpcName: 'Rica',
    giverVillageName: 'Selzen',
    status: 'active',
    ...overrides,
  };
}

function createActivePurgeSideQuest(overrides = {}) {
  return {
    id: 'side-purge',
    title: 'Purge Eshmorn Mornva',
    description: 'Remove the mutant near Selzen.',
    conditionText: 'Kill 1 Eshmorn Mornva near Selzen.',
    objectiveType: 'eliminate',
    entities: [{ text: 'Eshmorn Mornva', type: 'monster' }, { text: 'Selzen', type: 'location' }],
    objectiveData: {
      monster: {
        targetName: 'Eshmorn Mornva',
        requiredKills: 1,
        currentKills: 0,
        villageName: 'Selzen',
        mutations: ['blink speed', 'acid blood', 'void armor'],
      },
    },
    children: [],
    isCompleted: false,
    track: 'side',
    giverNpcName: 'Kadra Zentor',
    giverVillageName: 'Distant Ridge',
    status: 'active',
    ...overrides,
  };
}

test('GameQuestRuntime revealRecoverHolder confirms target person when speaking with another villager', () => {
  const runtime = new GameQuestRuntime();
  const quest = createRecoverQuest();
  const renders = [];

  runtime.activeQuest = quest;
  runtime.questProgressTracker = new QuestProgressTracker(quest);
  runtime.questUiController = { renderQuest: (value) => renders.push(value) };

  const result = runtime.revealRecoverHolder('Thalthalira Harbor', 'Harbor Watchman');

  assert.equal(result.revealed, true);
  assert.equal(result.personName, 'Ilyan');
  assert.equal(quest.children[0].objectiveData.recover.isPersonKnown, true);
  assert.equal(renders.length, 1);
});

test('GameQuestRuntime moves recover holder to another village when confrontation ends with flee', () => {
  const runtime = new GameQuestRuntime();
  const quest = createRecoverQuest();
  const logs = [];

  runtime.activeQuest = quest;
  runtime.questProgressTracker = new QuestProgressTracker(quest);
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.recover.isPersonKnown = true;
  const start = runtime.startRecoverConfrontation('Ilyan', 'Thalthalira Harbor');
  assert.equal(start.status, 'started');

  const lines = runtime.resolveRecoverBattle('fled', {
    getAllVillageNames: () => ['Thalthalira Harbor', 'New Dawn', 'Evermoor'],
  }, {
    addItemToInventory: () => true,
  });

  logs.push(...lines);
  assert.equal(quest.children[0].objectiveData.recover.currentVillage === 'Thalthalira Harbor', false);
  assert.equal(quest.children[0].objectiveData.recover.hasFled, true);
  assert.equal(logs.length >= 1, true);
  assert.equal(quest.children[0].description.includes('fled'), true);
});

test('GameQuestRuntime completes recover objective and grants item after victory', () => {
  const runtime = new GameQuestRuntime();
  const quest = createRecoverQuest();
  const inventory = [];

  runtime.activeQuest = quest;
  runtime.questProgressTracker = new QuestProgressTracker(quest);
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.recover.isPersonKnown = true;
  const start = runtime.startRecoverConfrontation('Ilyan', 'Thalthalira Harbor');
  assert.equal(start.status, 'started');

  runtime.resolveRecoverBattle('victory', {
    getAllVillageNames: () => ['Thalthalira Harbor', 'New Dawn'],
  }, {
    addItemToInventory: (item) => {
      inventory.push(item.name);
      return true;
    },
  });

  assert.equal(quest.children[0].isCompleted, true);
  assert.equal(inventory.includes('Torva'), true);
});

test('GameQuestRuntime exposes contracts only from known quest nodes (in-progress + completed)', () => {
  const runtime = new GameQuestRuntime();
  const quest = createQuestWithKnownAndUnknownContracts();

  const barter = runtime['collectBarterContracts'](quest);
  const escort = runtime['collectEscortContracts'](quest);

  assert.equal(barter.some((contract) => contract.traderName === 'Olive'), true);
  assert.equal(barter.some((contract) => contract.traderName === 'Cora'), false);
  assert.equal(escort.some((contract) => contract.personName === 'Bram'), true);
});

test('GameQuestRuntime exposes only known quest location names for dialogue knowledge', () => {
  const runtime = new GameQuestRuntime();
  const quest = createQuestWithKnownAndUnknownContracts();

  runtime.activeQuest = quest;
  const locations = runtime.getKnownQuestLocationNames();

  assert.deepEqual(locations, ['Farwatch']);
});

test('GameQuestRuntime includes known side-quest locations in dialogue knowledge', () => {
  const runtime = new GameQuestRuntime();
  const quest = createQuestWithKnownAndUnknownContracts();

  runtime.activeQuest = quest;
  runtime.activeSideQuests = [createSideQuestWithLocation()];
  const locations = runtime.getKnownQuestLocationNames();

  assert.deepEqual(locations, ['Farwatch', 'Silver Ridge']);
});

test('GameQuestRuntime exposes defend contracts for known active defend objectives', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();

  const defendContracts = runtime['collectDefendContracts'](quest);

  assert.deepEqual(defendContracts, [
    {
      personName: 'Quinn Evans',
      villageName: 'Heights Gate',
      artifactName: 'Allies Coverage',
      activeDefenderNames: [],
      fallenDefenderNames: [],
    },
  ]);
});

test('GameQuestRuntime records fallen defenders and exposes them in defend contracts', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();
  runtime.activeQuest = quest;
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.defend.isDefenseActive = true;
  quest.children[0].objectiveData.defend.defenders = [
    { name: 'Mara', level: 2, maxHp: 10, currentHp: 10, inventoryItemIds: ['knife_t1'] },
    { name: 'Tor', level: 2, maxHp: 9, currentHp: 9, inventoryItemIds: ['armor_t1'] },
  ];

  const lines = runtime.applyDefenderBattleResults('Heights Gate', [{ name: 'Tor', hp: 4 }]);
  assert.equal(lines.some((line) => line.includes('Mara was killed')), true);

  const defendContracts = runtime['collectDefendContracts'](quest);
  assert.equal(defendContracts[0].fallenDefenderNames.includes('Mara'), true);
  assert.deepEqual(defendContracts[0].activeDefenderNames, ['Tor']);
});

test('GameQuestRuntime keeps defend ally maxHp fixed and preserves wounded values', () => {
  const runtime = new GameQuestRuntime();
  const defender = {
    name: 'Vara',
    level: 3,
    maxHp: 12,
    currentHp: 12,
    inventoryItemIds: [],
    stats: {
      damage: 4,
      armor: 1,
      mana: 0,
      vitality: 5,
      toughness: 0,
      strength: 0,
      agility: 0,
      connection: 0,
      intelligence: 0,
    },
  };

  const allyAtFullHp = runtime.createVillageCombatantFromDefender(defender);
  assert.equal(allyAtFullHp.maxHp, defender.maxHp);
  assert.equal(allyAtFullHp.hp, defender.maxHp);

  const woundedAlly = runtime.createVillageCombatantFromDefender({ ...defender, currentHp: 7 });
  assert.equal(woundedAlly.maxHp, defender.maxHp);
  assert.equal(woundedAlly.hp, 7);
});

test('GameQuestRuntime keeps stored defender maxHp and clamps survivor hp after battle', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();
  runtime.activeQuest = quest;
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.defend.isDefenseActive = true;
  quest.children[0].objectiveData.defend.defenders = [
    { name: 'Mara', level: 2, maxHp: 10, currentHp: 10, inventoryItemIds: [] },
  ];

  runtime.applyDefenderBattleResults('Heights Gate', [{ name: 'Mara', hp: 14, maxHp: 16 }]);
  assert.equal(quest.children[0].objectiveData.defend.defenders[0].maxHp, 10);
  assert.equal(quest.children[0].objectiveData.defend.defenders[0].currentHp, 10);
});

test('GameQuestRuntime defend objective starts with randomized 2-6 battles and does not always trigger on 12h wait', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();
  runtime.activeQuest = quest;
  runtime.questUiController = { renderQuest: () => {} };
  runtime.refreshContracts = () => {};
  runtime.randomInt = (min, max) => {
    if (min === 2 && max === 6) {
      return 2;
    }
    if (min === 540 && max === 1620) {
      return 1440;
    }
    if (min === 720 && max === 2160) {
      return 1440;
    }
    return min;
  };

  const started = runtime.tryStartDefendObjective('Heights Gate', 'Quinn Evans', ['Mara', 'Tor']);
  assert.equal(started.status, 'started');
  assert.equal(quest.children[0].objectiveData.defend.remainingBattles, 2);
  assert.equal(quest.children[0].objectiveData.defend.battleCooldownMinutes, 1440);

  const firstWait = runtime.onVillageTimeAdvanced('Heights Gate', 12 * 60);
  assert.equal(firstWait.triggeredBattle, false);

  const secondWait = runtime.onVillageTimeAdvanced('Heights Gate', 12 * 60);
  assert.equal(secondWait.triggeredBattle, true);
  assert.equal(quest.children[0].objectiveData.defend.remainingBattles, 1);
});

test('GameQuestRuntime side-quest offers enforce per-villager cap and acceptance flow', () => {
  const runtime = new GameQuestRuntime(1);
  const questA = createSideQuest({ id: 'side-a' });
  const questB = createSideQuest({ id: 'side-b' });

  assert.equal(runtime.registerVillageSideQuestOffer(questA), true);
  assert.equal(runtime.registerVillageSideQuestOffer(questB), false);
  assert.equal(runtime.getVillageSideQuestOffers('Ashford', 'Mira').length, 1);

  const accepted = runtime.acceptSideQuest('side-a');
  assert.equal(accepted.accepted, true);
  assert.equal(runtime.activeSideQuests.length, 1);
  assert.equal(runtime.activeSideQuests[0].status, 'active');
  assert.equal(runtime.getVillageSideQuestOffers('Ashford', 'Mira').length, 0);
});

test('GameQuestRuntime side-quest turn-in requires the original quest giver and ready status', () => {
  const runtime = new GameQuestRuntime();
  const sideQuest = createSideQuest({ id: 'side-turnin' });
  runtime.registerVillageSideQuestOffer(sideQuest);
  runtime.acceptSideQuest('side-turnin');

  const wrongNpc = runtime.turnInSideQuest('side-turnin', 'Other NPC', 'Ashford');
  assert.equal(wrongNpc.turnedIn, false);
  assert.equal(wrongNpc.reason, 'not-ready');

  assert.equal(runtime.markSideQuestReadyToTurnIn('side-turnin'), true);
  const wrongVillage = runtime.turnInSideQuest('side-turnin', 'Mira', 'Riverbend');
  assert.equal(wrongVillage.turnedIn, false);
  assert.equal(wrongVillage.reason, 'wrong-giver');

  const success = runtime.turnInSideQuest('side-turnin', 'Mira', 'Ashford');
  assert.equal(success.turnedIn, true);
  assert.equal(success.rewardMetadata?.xp, 18);
  assert.equal(success.rewardMetadata?.gold, 18);
  assert.equal(runtime.activeSideQuests[0].status, 'completed');
});

test('GameQuestRuntime exposes and replaces known side quests across offers and active lists', () => {
  const runtime = new GameQuestRuntime();
  const offeredQuest = createSideQuest({ id: 'side-offer', status: 'available' });
  const activeQuest = createSideQuest({ id: 'side-active', status: 'active' });
  runtime.questUiController = { renderQuest: () => {} };
  runtime.registerVillageSideQuestOffer(offeredQuest);
  runtime.registerVillageSideQuestOffer(activeQuest);
  runtime.acceptSideQuest('side-active');

  assert.equal(runtime.getKnownSideQuest('side-offer')?.id, 'side-offer');
  assert.equal(runtime.getKnownSideQuest('side-active')?.id, 'side-active');

  const replacementOffer = createSideQuest({ id: 'side-offer-2', title: 'Fresh Offer', status: 'available' });
  const replacementActive = createSideQuest({ id: 'side-active-2', title: 'Fresh Active', status: 'active' });
  assert.equal(runtime.replaceKnownSideQuest('side-offer', replacementOffer), true);
  assert.equal(runtime.replaceKnownSideQuest('side-active', replacementActive), true);

  assert.equal(runtime.getKnownSideQuest('side-offer'), null);
  assert.equal(runtime.getKnownSideQuest('side-offer-2')?.title, 'Fresh Offer');
  assert.equal(runtime.activeSideQuests[0].id, 'side-active-2');
});

test('GameQuestRuntime marks deliver side quests ready when reaching destination with carried courier item', () => {
  const runtime = new GameQuestRuntime();
  const mainQuest = createRecoverQuest();
  runtime.activeQuest = mainQuest;
  runtime.questProgressTracker = new QuestProgressTracker(mainQuest);
  runtime.questUiController = { renderQuest: () => {} };
  runtime.activeSideQuests = [
    createSideQuest({
      id: 'side-deliver-quest',
      status: 'active',
      children: [{
        id: 'side-deliver-quest.1',
        title: 'Courier objective',
        description: '',
        conditionText: '',
        objectiveType: 'deliver',
        entities: [],
        objectiveData: {
          deliver: {
            sourceVillage: 'Selzen',
            sourceTrader: 'Alisha Alondra',
            destinationVillage: 'Golden Beacon',
            itemName: 'Eshdra Lorka',
            isPickedUp: true,
          },
        },
        children: [],
      }],
    }),
  ];

  const changed = runtime.recordLocationEntry('Golden Beacon', ['Eshdra Lorka']);
  assert.equal(changed.changed, true);
  assert.equal(runtime.activeSideQuests[0].status, 'readyToTurnIn');
});

test('GameQuestRuntime marks active scout side quests ready to turn in after entering objective village', () => {
  const runtime = new GameQuestRuntime();
  const mainQuest = createQuestWithKnownAndUnknownContracts();
  const sideQuest = createActiveScoutSideQuest();
  runtime.activeQuest = mainQuest;
  runtime.questProgressTracker = new QuestProgressTracker(mainQuest);
  runtime.questUiController = { renderQuest: () => {} };
  runtime.refreshContracts = () => {};
  runtime.activeSideQuests = [sideQuest];

  const updated = runtime.recordLocationEntry('Golden Beacon', []);

  assert.equal(updated.changed, true);
  assert.equal(sideQuest.children[0].isCompleted, true);
  assert.equal(sideQuest.isCompleted, true);
  assert.equal(sideQuest.status, 'readyToTurnIn');
});

test('GameQuestRuntime auto-recovers side-quest recover items on village entry and marks quest ready to turn in', () => {
  const runtime = new GameQuestRuntime();
  const mainQuest = createQuestWithKnownAndUnknownContracts();
  const sideQuest = createActiveRecoverSideQuest();
  const foundItems = [];
  runtime.activeQuest = mainQuest;
  runtime.questProgressTracker = new QuestProgressTracker(mainQuest);
  runtime.questUiController = { renderQuest: () => {} };
  runtime.refreshContracts = () => {};
  runtime.activeSideQuests = [sideQuest];

  const updated = runtime.recordLocationEntry('Golden Beacon', [], (item) => {
    foundItems.push(item.name);
    return true;
  });

  assert.equal(updated.changed, true);
  assert.equal(foundItems.includes('Torlys Eshlor'), true);
  assert.equal(updated.logs.some((line) => line.includes('Found Torlys Eshlor lying on the ground in Golden Beacon')), true);
  assert.equal(sideQuest.isCompleted, true);
  assert.equal(sideQuest.status, 'readyToTurnIn');
});

test('GameQuestRuntime does not complete recover side quest when inventory rejects awarded item', () => {
  const runtime = new GameQuestRuntime();
  const mainQuest = createQuestWithKnownAndUnknownContracts();
  const sideQuest = createActiveRecoverSideQuest({ title: 'Recover blocked item' });
  runtime.activeQuest = mainQuest;
  runtime.questProgressTracker = new QuestProgressTracker(mainQuest);
  runtime.questUiController = { renderQuest: () => {} };
  runtime.refreshContracts = () => {};
  runtime.activeSideQuests = [sideQuest];

  const updated = runtime.recordLocationEntry('Golden Beacon', [], () => false);

  assert.equal(updated.changed, true);
  assert.equal(updated.logs.some((line) => line.includes('inventory is full')), true);
  assert.equal(sideQuest.isCompleted, false);
  assert.equal(sideQuest.status, 'active');
});

test('GameQuestRuntime can spawn monster encounter for active purge side quest near objective village', () => {
  const runtime = new GameQuestRuntime();
  const mainQuest = createRecoverQuest();
  const sideQuest = createActivePurgeSideQuest();
  runtime.activeQuest = mainQuest;
  runtime.questProgressTracker = new QuestProgressTracker(mainQuest);
  runtime.questUiController = { renderQuest: () => {} };
  runtime.activeSideQuests = [sideQuest];

  const randomOriginal = Math.random;
  Math.random = () => 0.1;

  try {
    const encounter = runtime.tryCreateQuestMonsterEncounter({
      getVillageDirectionHintFromPlayer: () => ({ exists: true, villageName: 'Selzen', direction: 'east', distanceCells: 2 }),
    });

    assert.notEqual(encounter, null);
    assert.equal(encounter.enemies.length, 1);
    assert.equal(encounter.enemies[0].name, 'Eshmorn Mornva');
  } finally {
    Math.random = randomOriginal;
  }
});

test('GameQuestRuntime marks purge side quest ready to turn in and blocks further encounters after required kills', () => {
  const runtime = new GameQuestRuntime();
  const mainQuest = createRecoverQuest();
  const sideQuest = createActivePurgeSideQuest();
  runtime.activeQuest = mainQuest;
  runtime.questProgressTracker = new QuestProgressTracker(mainQuest);
  runtime.questUiController = { renderQuest: () => {} };
  runtime.activeSideQuests = [sideQuest];

  const changed = runtime.recordMonsterKill('Eshmorn Mornva');
  assert.equal(changed, true);
  assert.equal(sideQuest.isCompleted, true);
  assert.equal(sideQuest.status, 'readyToTurnIn');

  const encounter = runtime.tryCreateQuestMonsterEncounter({
    getVillageDirectionHintFromPlayer: () => ({ exists: true, villageName: 'Selzen', direction: 'east', distanceCells: 2 }),
  });
  assert.equal(encounter, null);
});
