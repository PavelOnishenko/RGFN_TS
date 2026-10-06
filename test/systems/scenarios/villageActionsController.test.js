import test from 'node:test';
import assert from 'node:assert/strict';

import VillageActionsController from '../../../dist/systems/village/VillageActionsController.js';

function createClassList() {
  const classes = new Set();
  return {
    added: [],
    removed: [],
    add(name) {
      this.added.push(name);
      classes.add(name);
    },
    remove(name) {
      this.removed.push(name);
      classes.delete(name);
    },
    toggle(name, force) {
      if (typeof force === 'boolean') {
        if (force) {
          this.add(name);
          return true;
        }
        this.remove(name);
        return false;
      }
      if (classes.has(name)) {
        this.remove(name);
        return false;
      }
      this.add(name);
      return true;
    },
    contains(name) {
      return classes.has(name);
    },
  };
}

function createElement(tag = 'div') {
  return {
    tag,
    type: '',
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    options: [],
    dataset: {},
    listeners: {},
    classList: createClassList(),
    children: [],
    scrollTop: 0,
    scrollHeight: 0,
    appendChild(child) {
      this.children.push(child);
      if (this.tag === 'select') {
        this.options.push(child);
      }
      this.scrollHeight += 1;
      return child;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}

function createVillageUi() {
  return {
    sidebar: createElement(),
    rumorsPanel: createElement(),
    title: createElement(),
    prompt: createElement(),
    actions: createElement(),
    sleepRoomBtn: createElement('button'),
    innMealBtn: createElement('button'),
    villageWaitBtn: createElement('button'),
    dialogueModal: createElement(),
    dialogueCloseBtn: createElement('button'),
    dialogueSelectedNpc: createElement(),
    dialogueLog: createElement(),
    sideQuestPanel: createElement(),
    sideQuestList: createElement(),
    buyOffer1Btn: createElement('button'),
    buyOffer2Btn: createElement('button'),
    buyOffer3Btn: createElement('button'),
    buyOffer4Btn: createElement('button'),
    sellSelect: createElement('select'),
    sellSelectedBtn: createElement('button'),
    npcList: createElement(),
    npcTitle: createElement(),
    rosterVillageFilter: createElement('select'),
    rosterList: createElement(),
    askVillageInput: createElement('select'),
    askVillageBtn: createElement('button'),
    askNearbySettlementsBtn: createElement('button'),
    askPersonInput: createElement('select'),
    askPersonBtn: createElement('button'),
    askBarterBtn: createElement('button'),
    barterNowBtn: createElement('button'),
    courierActionBtn: createElement('button'),
    confrontRecoverBtn: createElement('button'),
    recruitEscortBtn: createElement('button'),
    defendVillageBtn: createElement('button'),
    leaveBtn: createElement('button'),
  };
}

function containsTextInTree(element, text) {
  if (element.textContent === text) {
    return true;
  }
  const children = Array.isArray(element.children) ? element.children : [];
  return children.some((child) => containsTextInTree(child, text));
}

function createPlayerStub() {
  const inventory = [];
  return {
    gold: 50,
    addItemToInventory: (item) => { inventory.push(item); return true; },
    removeInventoryItemAt: (index) => inventory.splice(index, 1)[0] ?? null,
    getInventory: () => [...inventory],
    heal: () => {},
    restoreMana: () => {},
    recoverFatigue: () => 0,
  };
}

function withDocumentStub(fn) {
  const original = globalThis.document;
  globalThis.document = {
    createElement: (tag) => createElement(tag),
  };

  try {
    fn();
  } finally {
    globalThis.document = original;
  }
}

function withDeveloperMode(enabled, fn) {
  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: () => JSON.stringify({
        enabled,
        everythingDiscovered: enabled,
        fogOfWar: true,
        questIntroEnabled: !enabled,
        encounterTypes: { monster: true, item: true, traveler: true },
        autoGodBoostOnCharacterCreation: enabled,
      }),
      setItem: () => {},
    },
  };

  try {
    fn();
  } finally {
    globalThis.window = originalWindow;
  }
}

test('VillageActionsController keeps village rumor NPC roster stable across re-entry to same village', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  let createNpcRosterCalls = 0;
  controller['dialogueEngine'] = {
    createNpcRoster: (villageName) => {
      createNpcRosterCalls += 1;
      if (villageName === 'Mossbrook') {
        return [
          { id: 'mossbrook-0', name: 'Mara', role: 'Trader', look: 'patched vest', speechStyle: 'calm', disposition: 'truthful' },
          { id: 'mossbrook-1', name: 'Tor', role: 'Hunter', look: 'old armor', speechStyle: 'cold', disposition: 'liar' },
        ];
      }

      return [{ id: 'other-0', name: 'Iven', role: 'Miller', look: 'cloak', speechStyle: 'warm', disposition: 'imprecise' }];
    },
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const firstRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  controller.enterVillage('Mossbrook');
  const secondRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  assert.deepEqual(secondRoster, firstRoster);
  assert.equal(createNpcRosterCalls, 1);
}));

test('VillageActionsController renders roster panel entries and village filter options', () => withDeveloperMode(true, () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getAllVillagePlacements: () => [
      { name: 'Mossbrook', col: 10, row: 10 },
      { name: 'Oakhaven', col: 20, row: 20 },
    ],
    getNpcWorldState: (npcId) => {
      const villageName = npcId.startsWith('Mossbrook') ? 'Mossbrook' : 'Oakhaven';
      const homeCell = villageName === 'Mossbrook' ? { col: 10, row: 10 } : { col: 20, row: 20 };
      const isHunter = npcId.endsWith('hunter');
      return {
        homeCell,
        currentCell: isHunter ? { col: homeCell.col + 1, row: homeCell.row } : homeCell,
        currentTask: isHunter ? 'returnHome' : 'carpentry',
        route: isHunter ? [homeCell] : [],
      };
    },
  });

  controller['dialogueEngine'] = {
    createNpcRoster: (villageName) => ([
      { id: `${villageName}-carpenter`, name: `${villageName} Bram`, role: 'Carpenter', look: 'apron', speechStyle: 'quiet', disposition: 'silent' },
      { id: `${villageName}-hunter`, name: `${villageName} Iven`, role: 'Hunter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' },
    ]),
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.enterVillage('Oakhaven');

  assert.equal(villageUI.rosterVillageFilter.options.length >= 3, true);
  assert.equal(villageUI.rosterList.children.length >= 4, true);
  const carpenterText = villageUI.rosterList.children.find((row) => row.textContent.startsWith('Mossbrook Bram')).textContent;
  assert.match(carpenterText, /Home village: Mossbrook · Home tile: \(10, 10\)/);
  assert.match(carpenterText, /Right now: Mossbrook at \(10, 10\)/);
  assert.match(carpenterText, /Doing: carpentry work/);
  assert.match(carpenterText, /Heading to: staying at the current location/);
  const hunterText = villageUI.rosterList.children.find((row) => row.textContent.startsWith('Mossbrook Iven')).textContent;
  assert.match(hunterText, /Right now: outside Mossbrook at world cell \(11, 10\)/);
  assert.match(hunterText, /Doing: returning home/);
  assert.match(hunterText, /Heading to: Mossbrook at \(10, 10\)/);
})));

test('VillageActionsController shows village actions + rumors on entry and hides both on exit', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, createElement(), {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller.enterVillage('Mossbrook');
  assert.equal(villageUI.actions.classList.contains('hidden'), false);
  assert.equal(villageUI.rumorsPanel.classList.contains('hidden'), false);
  assert.equal(villageUI.sidebar.classList.contains('hidden'), true);

  controller.exitVillage();
  assert.equal(villageUI.actions.classList.contains('hidden'), true);
  assert.equal(villageUI.rumorsPanel.classList.contains('hidden'), true);
}));

test('VillageActionsController rolls side-quest offers per villager on village entry', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const sideQuestOfferRolls = [];
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    initializeVillageSideQuestOffers: (villageName, rolls) => sideQuestOfferRolls.push({ villageName, rolls }),
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [
      { id: 'moss-0', name: 'Mara', role: 'Trader', look: 'satchel', speechStyle: 'calm', disposition: 'truthful' },
      { id: 'moss-1', name: 'Tor', role: 'Hunter', look: 'boots', speechStyle: 'cold', disposition: 'liar' },
    ],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  const originalMathRandom = Math.random;
  const randomValues = [0.15, 0.11, 0.9];
  Math.random = () => randomValues.shift() ?? 0.95;

  try {
    controller.enterVillage('Mossbrook');
  } finally {
    Math.random = originalMathRandom;
  }

  assert.equal(sideQuestOfferRolls.length, 1);
  assert.equal(sideQuestOfferRolls[0].villageName, 'Mossbrook');
  assert.equal(Array.isArray(sideQuestOfferRolls[0].rolls), true);
  sideQuestOfferRolls[0].rolls.forEach((entry) => {
    assert.equal(typeof entry.npcName, 'string');
    assert.equal(entry.questCount >= 1 && entry.questCount <= 3, true);
  });
}));

test('VillageActionsController stores separate rumor rosters for different villages', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: (villageName) => villageName === 'Mossbrook'
      ? [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'satchel', speechStyle: 'calm', disposition: 'truthful' }]
      : [{ id: 'oak-0', name: 'Garr', role: 'Carpenter', look: 'boots', speechStyle: 'formal', disposition: 'silent' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const mossbrookRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  controller.enterVillage('Oakhaven');
  const oakhavenRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  controller.enterVillage('Mossbrook');
  const mossbrookAgain = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  assert.notDeepEqual(oakhavenRoster, mossbrookRoster);
  assert.deepEqual(mossbrookAgain, mossbrookRoster);
}));

test('VillageActionsController injects Olive into first visited village and keeps roster stable', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });
  controller.configureQuestBarterContracts([{ traderName: 'Olive', itemName: 'Kator Kaesh' }]);

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'other-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Olive'), true);

  controller.enterVillage('Mossbrook');
  const secondNames = controller['npcRoster'].map((npc) => npc.name);
  assert.deepEqual(secondNames, names);
}));

test('VillageActionsController binds dynamically generated barter trader names without hardcoded NPC names', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 5 }),
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([{ traderName: 'Veyra', itemName: 'Night Sigil' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Veyra'), true);
  const hint = controller['barterService'].getPersonDirectionHint('Veyra', controller['callbacks'].getVillageDirectionHint);
  assert.equal(hint.exists, true);
  assert.equal(hint.villageName, 'Mossbrook');
}));

test('VillageActionsController injects defend contact NPC into the target village roster', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 3 }),
    onVillageBarterCompleted: () => {},
    onTryStartDefend: () => ({ status: 'inactive' }),
  });

  controller.configureQuestDefendContracts([
    { personName: 'Quinn Evans', villageName: 'Heights Gate', artifactName: 'Allies Coverage' },
  ]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'heights-0', name: 'Mara', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Heights Gate');
  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Quinn Evans'), true);
}));

test('VillageActionsController keeps fallen defenders in roster and marks them as dead', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 3 }),
    onVillageBarterCompleted: () => {},
    onTryStartDefend: () => ({ status: 'inactive' }),
  });

  controller.configureQuestDefendContracts([
    {
      personName: 'Quinn Evans',
      villageName: 'Heights Gate',
      artifactName: 'Allies Coverage',
      fallenDefenderNames: ['Mara'],
    },
  ]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [
      { id: 'heights-0', name: 'Mara', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' },
      { id: 'heights-1', name: 'Tor', role: 'Guard', look: 'hood', speechStyle: 'grim', disposition: 'truthful' },
    ],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Heights Gate');
  const mara = controller['npcRoster'].find((npc) => npc.name === 'Mara');
  const tor = controller['npcRoster'].find((npc) => npc.name === 'Tor');
  assert.equal(typeof mara?.role, 'string');
  assert.equal(mara?.role.includes('[DEAD]'), true);
  assert.equal(tor?.role.includes('[DEAD]'), false);
}));

test('VillageActionsController adds revealed recover holder into current village roster immediately', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    onRevealRecoverHolder: () => ({ revealed: true, personName: 'Pablo Menéndez', itemName: 'Torva' }),
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Tor', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Thalthalira Harbor');
  controller.handleSelectNpc(0);

  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Pablo Menéndez'), true);
}));

test('VillageActionsController confront button starts recover battle for selected holder', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  let startedBattle = false;
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    onRevealRecoverHolder: () => ({ revealed: true, personName: 'Pablo Menéndez', itemName: 'Torva' }),
    onTryStartRecoverConfrontation: () => ({ status: 'started', enemies: [{ id: 'recover-enemy' }], itemName: 'Torva' }),
    onStartBattle: () => { startedBattle = true; },
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Tor', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Thalthalira Harbor');
  controller.handleSelectNpc(0);
  controller.handleSelectNpc(0);
  controller.handleConfrontRecoverTarget();

  assert.equal(startedBattle, true);
}));

test('VillageActionsController mirrors dialogue lines into modal log and toggles modal visibility', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleEnter('Mossbrook');
  assert.equal(villageUI.dialogueModal.classList.contains('hidden'), true);
  controller.handleSelectNpc(0);
  assert.equal(villageUI.dialogueModal.classList.removed.includes('hidden'), true);

  controller.addLog('Modal mirror check', 'system');
  assert.equal(gameLog.children.some((child) => child.textContent === 'Modal mirror check'), true);
  assert.equal(villageUI.dialogueLog.children.some((child) => child.textContent === 'Modal mirror check'), true);

  controller.closeDialogueWindow();
  assert.equal(villageUI.dialogueModal.classList.added.includes('hidden'), true);
}));

test('VillageActionsController hides undiscovered settlement and person targets when developer mode is off', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'west', distanceCells: 4 }),
    getKnownSettlementNames: () => ['Mossbrook', 'Questspire'],
    getKnownQuestSettlementNames: () => ['Golder Bridge', 'Distant Cove'],
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([
    { traderName: 'Olive', itemName: 'Kator Kaesh', sourceVillage: 'Mossbrook' },
    { traderName: 'Cora', itemName: 'Void Relic', sourceVillage: 'Farwatch' },
  ]);
  controller.configureQuestEscortContracts([{ personName: 'Bram', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const settlementOptions = villageUI.askVillageInput.options.map((option) => option.value);
  const personOptions = villageUI.askPersonInput.options.map((option) => option.value);

  assert.deepEqual(settlementOptions, ['Distant Cove', 'Golder Bridge', 'Mossbrook', 'Questspire']);
  assert.deepEqual(personOptions, ['Bram', 'Mara', 'Olive']);
}));

test('VillageActionsController shows undiscovered settlement and person targets in developer mode', () => withDeveloperMode(true, () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'west', distanceCells: 4 }),
    getKnownSettlementNames: () => ['Mossbrook', 'Questspire'],
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([
    { traderName: 'Olive', itemName: 'Kator Kaesh', sourceVillage: 'Mossbrook' },
    { traderName: 'Cora', itemName: 'Void Relic', sourceVillage: 'Farwatch' },
  ]);
  controller.configureQuestEscortContracts([{ personName: 'Bram', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const settlementOptions = villageUI.askVillageInput.options.map((option) => option.value);
  const personOptions = villageUI.askPersonInput.options.map((option) => option.value);

  assert.deepEqual(settlementOptions, ['Farwatch', 'Mossbrook', 'Questspire']);
  assert.deepEqual(personOptions, ['Bram', 'Cora', 'Mara', 'Olive']);
})));

test('VillageActionsController allows safe room sleep only with innkeeper selected', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const player = createPlayerStub();
  player.gold = 20;
  let recovered = 0;
  player.recoverFatigue = (value) => { recovered = value; return value; };

  const controller = new VillageActionsController(player, villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'inn-0', name: 'Mara', role: 'Innkeeper', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleEnter('Mossbrook');
  controller.handleSelectNpc(0);
  controller.handleSleepInRoom();

  assert.equal(recovered > 0, true);
  assert.equal(player.gold < 20, true);
}));

test('VillageActionsController advances long village time and applies tiny regen when waiting', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const onAdvanceTimeCalls = [];
  const player = createPlayerStub();
  let healedBy = 0;
  let manaBy = 0;
  player.heal = (amount) => { healedBy += amount; };
  player.restoreMana = (amount) => { manaBy += amount; };

  const controller = new VillageActionsController(player, villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: (minutes, fatigueScale) => onAdvanceTimeCalls.push({ minutes, fatigueScale }),
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller.handleVillageWait();

  assert.equal(onAdvanceTimeCalls.length, 1);
  assert.deepEqual(onAdvanceTimeCalls[0], { minutes: 720, fatigueScale: 0.5 });
  assert.equal(healedBy, 1);
  assert.equal(manaBy, 1);
  assert.equal(gameLog.children.some((child) => String(child.textContent ?? '').includes('You wait in the village for 12h.')), true);
}));

test('VillageActionsController asks NPC about nearby settlements via dialogue engine', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 7 }),
    getKnownSettlementNames: () => ['Mossbrook', 'Farwatch'],
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildNearbySettlementsAnswer: () => ({ speech: 'Nearby list.', tone: 'Confident tone.', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);
  controller.handleAskAboutNearbySettlements();

  assert.equal(gameLog.children.length > 0, true);
}));

test('VillageActionsController shows contextual dialogue action buttons only when available for selected NPC', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onTryRecruitEscort: () => 'not-available',
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([{ traderName: 'Olive', itemName: 'Kator Kaesh', sourceVillage: 'Mossbrook' }]);
  controller.configureQuestEscortContracts([{ personName: 'Olive', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  assert.equal(villageUI.askBarterBtn.classList.contains('hidden'), true);
  assert.equal(villageUI.barterNowBtn.classList.contains('hidden'), true);
  assert.equal(villageUI.confrontRecoverBtn.classList.contains('hidden'), true);
  assert.equal(villageUI.recruitEscortBtn.classList.contains('hidden'), true);

  const oliveIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Olive');
  controller.handleSelectNpc(oliveIndex);
  assert.equal(villageUI.askBarterBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.barterNowBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.recruitEscortBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.confrontRecoverBtn.classList.contains('hidden'), true);

  controller['callbacks'].onRevealRecoverHolder = () => ({ revealed: true, personName: 'Pablo Menéndez', itemName: 'Torva' });
  controller.handleSelectNpc(oliveIndex);
  const recoverIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Pablo Menéndez');
  controller.handleSelectNpc(recoverIndex);
  assert.equal(villageUI.confrontRecoverBtn.classList.contains('hidden'), false);
}));

test('VillageActionsController shows defend dialogue action only for NPCs with defend contracts in the current village', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onTryRecruitEscort: () => 'not-available',
    onTryStartDefend: () => ({ status: 'inactive' }),
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestDefendContracts([{ personName: 'Olive', villageName: 'Mossbrook', days: 2, enemyPools: [] }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  assert.equal(villageUI.defendVillageBtn.classList.contains('hidden'), true);

  const oliveIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Olive');
  controller.handleSelectNpc(oliveIndex);
  assert.equal(villageUI.defendVillageBtn.classList.contains('hidden'), false);

  const maraIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Mara');
  controller.handleSelectNpc(maraIndex);
  assert.equal(villageUI.defendVillageBtn.classList.contains('hidden'), true);
}));

test('VillageActionsController exposes courier dialogue action to pick up and deliver local side-quest packages', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const player = createPlayerStub();
  let markedReadyQuestId = '';
  const localDeliveryQuest = {
    id: 'side-courier-1',
    title: 'Local Delivery: Ration Crate',
    description: 'Collect and deliver ration crate in Mossbrook.',
    status: 'active',
    children: [
      {
        objectiveType: 'localDelivery',
        objectiveData: {
          localDelivery: {
            villageName: 'Mossbrook',
            sourceNpcName: 'Olive',
            recipientNpcName: 'Mara',
            itemName: 'Ration Crate',
            isPickedUp: false,
            isDelivered: false,
          },
        },
      },
    ],
  };
  const controller = new VillageActionsController(player, villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getActiveSideQuests: () => [localDeliveryQuest],
    getVillageNpcActiveSideQuests: () => [],
    getVillageSideQuestOffers: () => [],
    markSideQuestReadyToTurnIn: (questId) => { markedReadyQuestId = questId; return true; },
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [
      { id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' },
      { id: 'moss-1', name: 'Olive', role: 'Courier Handler', look: 'satchel', speechStyle: 'brisk', disposition: 'truthful' },
    ],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');

  const oliveIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Olive');
  controller.handleSelectNpc(oliveIndex);
  assert.equal(villageUI.courierActionBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.courierActionBtn.textContent, 'Pick up Ration Crate');
  controller.handleCourierAction();
  assert.equal(localDeliveryQuest.children[0].objectiveData.localDelivery.isPickedUp, true);
  assert.equal(player.getInventory().some((item) => item.name === 'Ration Crate'), true);

  const maraIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Mara');
  controller.handleSelectNpc(maraIndex);
  assert.equal(villageUI.courierActionBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.courierActionBtn.textContent, 'Hand over Ration Crate');
  controller.handleCourierAction();

  assert.equal(localDeliveryQuest.children[0].objectiveData.localDelivery.isDelivered, true);
  assert.equal(player.getInventory().some((item) => item.name === 'Ration Crate'), false);
  assert.equal(markedReadyQuestId, 'side-courier-1');
}));

test('VillageActionsController exposes courier pickup action for deliver side quests in source village', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const player = createPlayerStub();
  const deliverSideQuest = {
    id: 'side-deliver-1',
    title: 'Courier: Eshdra Lorka',
    description: 'Acquire Eshdra Lorka from Alisha Alondra in Selzen, then carry it to Golden Beacon.',
    status: 'active',
    children: [
      {
        objectiveType: 'deliver',
        objectiveData: {
          deliver: {
            sourceVillage: 'Selzen',
            sourceTrader: 'Alisha Alondra',
            destinationVillage: 'Golden Beacon',
            itemName: 'Eshdra Lorka',
            isPickedUp: false,
          },
        },
      },
    ],
  };
  const controller = new VillageActionsController(player, villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getActiveSideQuests: () => [deliverSideQuest],
    getVillageNpcActiveSideQuests: () => [deliverSideQuest],
    getVillageSideQuestOffers: () => [],
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'selzen-0', name: 'Alisha Alondra', role: 'Herbalist', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Selzen');
  controller.handleSelectNpc(0);

  assert.equal(villageUI.courierActionBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.courierActionBtn.textContent, 'Pick up Eshdra Lorka');
  controller.handleCourierAction();
  assert.equal(deliverSideQuest.children[0].objectiveData.deliver.isPickedUp, true);
  assert.equal(player.getInventory().some((item) => item.name === 'Eshdra Lorka'), true);
}));

test('VillageActionsController requires explicit side-quest acceptance and exposes accept action in dialogue UI', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  let acceptCalls = 0;
  const offerQuest = {
    id: 'side-quest-offer',
    title: 'Patch the Mill Wheel',
    description: 'Assist Mara with a local task in Mossbrook.',
    reward: '20g',
    status: 'available',
    children: [{ description: 'Carry repair tools from the smithy to the mill wheel before sunset.' }],
  };
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getVillageSideQuestOffers: () => [offerQuest],
    getVillageNpcActiveSideQuests: () => [],
    acceptSideQuest: () => { acceptCalls += 1; return { accepted: true }; },
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);

  assert.equal(acceptCalls, 0);
  const acceptButton = villageUI.sideQuestList.children.find((child) => containsTextInTree(child, 'Accept quest'));
  assert.ok(acceptButton);
  assert.equal(
    acceptButton.children.some((entry) => String(entry.textContent ?? '').includes('Task details: Carry repair tools from the smithy to the mill wheel before sunset.')),
    true,
  );
  const hasRefuseButton = villageUI.sideQuestList.children.some((child) => containsTextInTree(child, 'Refuse'));
  assert.equal(hasRefuseButton, true);
  controller.handleAcceptSideQuest('side-quest-offer');
  assert.equal(acceptCalls, 1);
  assert.equal(gameLog.children.some((child) => String(child.textContent ?? '').includes('Side quest accepted')), true);
}));

test('VillageActionsController refreshSelectedNpcSideQuestUi re-renders selected NPC offer details after regeneration', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  let currentOffers = [{
    id: 'side-old',
    title: 'Old Offer',
    description: 'Old quest details.',
    reward: '11g',
    status: 'available',
    children: [{ description: 'Old task.' }],
  }];
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getVillageSideQuestOffers: () => currentOffers,
    getVillageNpcActiveSideQuests: () => [],
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'hollow-0', name: 'Kadra Zentor', role: 'Miller', look: 'braided hair', speechStyle: 'direct', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Hollow Reach');
  controller.handleSelectNpc(0);
  assert.equal(containsTextInTree(villageUI.sideQuestList, 'Old Offer — Offer available'), true);

  currentOffers = [{
    id: 'side-new',
    title: 'Regenerated Offer',
    description: 'New quest details.',
    reward: '27g',
    status: 'available',
    children: [{ description: 'New task.' }],
  }];
  controller.refreshSelectedNpcSideQuestUi();

  const latestCard = villageUI.sideQuestList.children.at(-1);
  assert.ok(latestCard);
  assert.equal(containsTextInTree(latestCard, 'Regenerated Offer — Offer available'), true);
  assert.equal(containsTextInTree(latestCard, 'Reward preview: 27g'), true);
}));
  
test('VillageActionsController allows refusing a side-quest offer and keeps other offers visible', () => withDeveloperMode(true, () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const firstOffer = {
    id: 'side-quest-offer-1',
    title: 'Patch the Mill Wheel',
    description: 'Bring repair tools to the village mill.',
    reward: '20g',
    status: 'available',
    children: [],
  };
  const secondOffer = {
    id: 'side-quest-offer-2',
    title: 'Track Missing Cart',
    description: 'Follow wheel marks east of the ford.',
    reward: '18g',
    status: 'available',
    children: [],
  };
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getVillageSideQuestOffers: () => [firstOffer, secondOffer],
    getVillageNpcActiveSideQuests: () => [],
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);
  assert.equal(villageUI.sideQuestList.children.length, 2);

  controller.handleDismissSideQuestOffer('side-quest-offer-1');
  assert.equal(villageUI.sideQuestList.children.length >= 1, true);
  assert.equal(gameLog.children.some((child) => String(child.textContent ?? '').includes('Side-quest offer hidden')), true);
})));

test('VillageActionsController does not auto-accept side quests in developer mode', () => withDeveloperMode(true, () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  let acceptCalls = 0;
  const offerQuest = {
    id: 'side-quest-offer-dev',
    title: 'Count Grain Sacks',
    description: 'Inspect missing grain sacks in the barn.',
    reward: '10g',
    status: 'available',
    children: [],
  };
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getVillageSideQuestOffers: () => [offerQuest],
    getVillageNpcActiveSideQuests: () => [],
    acceptSideQuest: () => { acceptCalls += 1; return { accepted: true }; },
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);

  assert.equal(acceptCalls, 0);
  const hasAcceptButton = villageUI.sideQuestList.children.some((child) => containsTextInTree(child, 'Accept quest'));
  assert.equal(hasAcceptButton, true);
  assert.equal(gameLog.children.some((child) => String(child.textContent ?? '').includes('Auto-accepted side quests')), false);
})));

test('VillageActionsController labels side-quest type in card header and omits boilerplate offer description', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const offerQuest = {
    id: 'side-quest-offer-type',
    title: 'Kadra Zentor\'s Request',
    description: 'Assist Kadra Zentor with a local task in Selzen.',
    reward: '29g',
    status: 'available',
    objectiveType: 'scout',
    children: [
      {
        id: 'side-quest-offer-type-leaf',
        title: 'Purge Sproutlings',
        description: 'Track and purge rare mutant targets.',
        reward: '29g',
        status: 'available',
        objectiveType: 'eliminate',
        children: [],
      },
    ],
  };
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getVillageSideQuestOffers: () => [offerQuest],
    getVillageNpcActiveSideQuests: () => [],
    acceptSideQuest: () => ({ accepted: true }),
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'sel-0', name: 'Kadra Zentor', role: 'Scout', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Selzen');
  controller.handleSelectNpc(0);

  const offerCard = villageUI.sideQuestList.children[0];
  assert.equal(Boolean(offerCard), true);
  assert.equal(offerCard.children.some((entry) => entry.textContent?.includes('Offer available (Purge)')), true);
  assert.equal(offerCard.children.some((entry) => entry.textContent === 'Assist Kadra Zentor with a local task in Selzen.'), false);
  assert.equal(offerCard.children.some((entry) => entry.textContent?.includes('Task details: Track and purge rare mutant targets.')), true);
}));

test('VillageActionsController shows turn-in action for ready side quests and turn-in is explicit', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  let turnInCalls = 0;
  let hudUpdates = 0;
  const readyQuest = {
    id: 'side-quest-ready',
    title: 'Deliver Herbs',
    description: 'Hand over the herb crate.',
    reward: 'Potion Bundle',
    status: 'readyToTurnIn',
    children: [],
  };
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => { hudUpdates += 1; },
    onLeaveVillage: () => {},
    onAdvanceTime: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getVillageSideQuestOffers: () => [],
    getVillageNpcActiveSideQuests: () => [readyQuest],
    turnInSideQuest: () => { turnInCalls += 1; return { turnedIn: true, reward: 'Potion Bundle' }; },
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);

  assert.equal(turnInCalls, 0);
  const hasTurnInButton = villageUI.sideQuestList.children.some((child) => child.children?.some((entry) => entry.textContent === 'Turn in quest'));
  assert.equal(hasTurnInButton, true);
  controller.handleTurnInSideQuest('side-quest-ready');
  assert.equal(turnInCalls, 1);
  assert.equal(hudUpdates, 1);
  assert.equal(gameLog.children.some((child) => String(child.textContent ?? '').includes('turn-in')), true);
}));

test('VillageActionsController applies quest-style generated names to village NPC rosters when provided', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const generatedNames = ['Ari Vale', 'Miller Forge', 'Nora Reed'];
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  }, { nextCharacterName: () => generatedNames.shift() ?? '' });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [
      { id: 'moss-0', name: 'Mara', role: 'Trader', look: 'satchel', speechStyle: 'calm', disposition: 'truthful' },
      { id: 'moss-1', name: 'Tor', role: 'Hunter', look: 'boots', speechStyle: 'cold', disposition: 'liar' },
      { id: 'moss-2', name: 'Iven', role: 'Guard', look: 'hood', speechStyle: 'warm', disposition: 'imprecise' },
    ],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const rosterNames = controller['npcRoster'].map((npc) => npc.name);
  assert.deepEqual(rosterNames, ['Ari Vale', 'Miller Forge', 'Nora Reed']);
}));

test('VillageActionsController greys sleeping NPCs and rejects direct dialogue selection', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getNpcCapabilities: () => ({
      canTalk: false,
      canShop: false,
      canServeInnMeal: false,
      canRentRoom: false,
      unavailableReason: 'sleeping',
    }),
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [
      { id: 'sleeping-guard', name: 'Nira', role: 'Guard', look: 'armor', speechStyle: 'calm', disposition: 'truthful' },
    ],
  };

  controller.enterVillage('Mossbrook');
  assert.equal(villageUI.npcList.children[0].disabled, true);
  assert.match(villageUI.npcList.children[0].textContent, /Sleeping/);
  controller.handleSelectNpc(0);
  assert.equal(controller['selectedNpcId'], null);
  assert.equal(villageUI.dialogueModal.classList.removed.includes('hidden'), false);
  assert.equal(gameLog.children.some((line) => String(line.textContent).includes('sleeping')), true);
}));

test('VillageActionsController gates shop and inn controls by the selected on-duty profession', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const advanceCalls = [];
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: (minutes) => advanceCalls.push(minutes),
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
    getNpcCapabilities: (npcId) => ({
      canTalk: true,
      canShop: npcId === 'trader',
      canServeInnMeal: npcId === 'innkeeper',
      canRentRoom: npcId === 'innkeeper',
      unavailableReason: null,
    }),
  });
  controller['dialogueEngine'] = {
    createNpcRoster: () => [
      { id: 'trader', name: 'A Trader', role: 'Trader', look: 'ledger', speechStyle: 'calm', disposition: 'truthful' },
      { id: 'innkeeper', name: 'B Innkeeper', role: 'Innkeeper', look: 'apron', speechStyle: 'warm', disposition: 'truthful' },
    ],
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);
  assert.equal(villageUI.buyOffer1Btn.disabled, false);
  assert.equal(villageUI.innMealBtn.disabled, true);

  controller.handleSelectNpc(1);
  assert.equal(villageUI.buyOffer1Btn.disabled, true);
  assert.equal(villageUI.innMealBtn.disabled, false);
  controller.handleInnMeal();
  assert.equal(advanceCalls.includes(50), true);
}));
