import test from 'node:test';
import assert from 'node:assert/strict';

import WorldSimulationRuntime from '../../dist/systems/world-sim/WorldSimulationRuntime.js';

function createNavigation(columns = 15, rows = 15) {
  const traversableCellKeys = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      traversableCellKeys.push(`${col},${row}`);
    }
  }
  return { columns, rows, traversableCellKeys };
}

function upsertNpc(runtime, npcId, role, homeCell = { col: 7, row: 7 }) {
  runtime.upsertNpc({
    npcId,
    homeVillageName: 'Oakrest',
    role,
    lifeStatus: 'alive',
    homeCell,
    identity: {
      displayName: npcId,
      look: 'test look',
      speechStyle: 'test speech',
      disposition: 'truthful',
      sourceTag: 'test',
    },
  });
}

test('WorldSimulationRuntime increments worldTick on each tick', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();

  assert.equal(runtime.getState().worldTick, 0);
  runtime.tick(5);
  assert.equal(runtime.getState().worldTick, 1);
  runtime.tick(12);
  assert.equal(runtime.getState().worldTick, 2);
});

test('WorldSimulationRuntime runs stages in the expected pipeline order', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();
  runtime.tick(10);

  assert.deepEqual(runtime.getState().lastStageOrder, [
    'taskAssign',
    'movement',
    'taskProgress',
    'conflicts',
    'villages',
  ]);
});

test('WorldSimulationRuntime applies profession-specific talk and service capabilities', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();
  runtime.setNavigationSnapshot(createNavigation());
  upsertNpc(runtime, 'trader', 'Trader');
  upsertNpc(runtime, 'miller', 'Miller');
  upsertNpc(runtime, 'guard', 'Guard');
  upsertNpc(runtime, 'innkeeper', 'Innkeeper');
  runtime.reconcileToMinute(10 * 60);

  assert.deepEqual(runtime.getNpcCapabilities('trader', 'Oakrest'), {
    canTalk: true,
    canShop: true,
    canServeInnMeal: false,
    canRentRoom: false,
    unavailableReason: null,
  });
  assert.equal(runtime.getNpcCapabilities('miller', 'Oakrest').unavailableReason, 'working');
  assert.equal(runtime.getNpcCapabilities('guard', 'Oakrest').canTalk, true);
  assert.deepEqual(runtime.getNpcCapabilities('innkeeper', 'Oakrest'), {
    canTalk: true,
    canShop: false,
    canServeInnMeal: true,
    canRentRoom: true,
    unavailableReason: null,
  });

  runtime.reconcileToMinute(23 * 60);
  ['trader', 'miller', 'guard', 'innkeeper'].forEach((npcId) => {
    const capabilities = runtime.getNpcCapabilities(npcId, 'Oakrest');
    assert.equal(capabilities.canTalk, false);
    assert.equal(capabilities.unavailableReason, 'sleeping');
  });
});

test('WorldSimulationRuntime moves hunters only within configured range and returns them before sleep', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();
  runtime.setNavigationSnapshot(createNavigation());
  upsertNpc(runtime, 'hunter', 'Hunter');
  runtime.reconcileToMinute(12 * 60);

  const noonState = runtime.getNpcState('hunter');
  assert.ok(noonState);
  assert.ok(Math.hypot(noonState.currentCell.col - 7, noonState.currentCell.row - 7) <= 3);
  assert.equal(runtime.getNpcCapabilities('hunter', 'Oakrest').canTalk, false);
  if (noonState.currentTask === 'hunt') {
    const workDuration = noonState.taskEndsAtMinute - noonState.taskStartedAtMinute;
    assert.ok(workDuration >= 30 && workDuration <= 120);
  }

  runtime.reconcileToMinute(21 * 60);
  const eveningState = runtime.getNpcState('hunter');
  assert.deepEqual(eveningState.currentCell, eveningState.homeCell);
  assert.equal(runtime.getNpcCapabilities('hunter', 'Oakrest').canTalk, true);
});

test('WorldSimulationRuntime deterministically gives herbalists about half field days within their separate radius', () => {
  const first = new WorldSimulationRuntime();
  const second = new WorldSimulationRuntime();
  first.initialize();
  second.initialize();
  first.setNavigationSnapshot(createNavigation());
  second.setNavigationSnapshot(createNavigation());
  for (let index = 0; index < 40; index += 1) {
    upsertNpc(first, `herbalist-${index}`, 'Herbalist');
    upsertNpc(second, `herbalist-${index}`, 'Herbalist');
  }
  first.reconcileToMinute(12 * 60);
  second.reconcileToMinute(12 * 60);

  const firstStates = first.getNpcStates();
  const fieldWorkers = firstStates.filter((npc) => npc.herbalistFieldDay);
  assert.ok(fieldWorkers.length >= 12 && fieldWorkers.length <= 28);
  assert.deepEqual(
    firstStates.map((npc) => npc.herbalistFieldDay),
    second.getNpcStates().map((npc) => npc.herbalistFieldDay),
  );
  fieldWorkers.forEach((npc) => {
    assert.ok(Math.hypot(npc.currentCell.col - 7, npc.currentCell.row - 7) <= 6);
  });
  firstStates.filter((npc) => !npc.herbalistFieldDay).forEach((npc) => {
    assert.equal(npc.currentTask, 'processHerbs');
    assert.equal(first.getNpcCapabilities(npc.npcId, 'Oakrest').canTalk, true);
  });
});

test('WorldSimulationRuntime large time jumps match minute-equivalent smaller ticks', () => {
  const largeJump = new WorldSimulationRuntime();
  const smallTicks = new WorldSimulationRuntime();
  [largeJump, smallTicks].forEach((runtime) => {
    runtime.initialize();
    runtime.setNavigationSnapshot(createNavigation());
    upsertNpc(runtime, 'hunter', 'Hunter');
    upsertNpc(runtime, 'trader', 'Trader');
  });
  largeJump.reconcileToMinute(21 * 60);
  for (let minute = 60; minute <= 21 * 60; minute += 60) {
    smallTicks.reconcileToMinute(minute);
  }
  assert.deepEqual(largeJump.getNpcStates(), smallTicks.getNpcStates());
});

test('WorldSimulationRuntime restores persisted NPC task and route state without rerolling', () => {
  const original = new WorldSimulationRuntime();
  original.initialize();
  original.setNavigationSnapshot(createNavigation());
  upsertNpc(original, 'hunter', 'Hunter');
  original.reconcileToMinute(12 * 60);

  const restored = new WorldSimulationRuntime();
  restored.initialize(original.getState());
  restored.setNavigationSnapshot(createNavigation());

  assert.equal(restored.wasRestoredWithNpcs(), true);
  assert.deepEqual(restored.getNpcState('hunter'), original.getNpcState('hunter'));
});
