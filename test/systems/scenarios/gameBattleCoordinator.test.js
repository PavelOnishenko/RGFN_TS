import test from 'node:test';
import assert from 'node:assert/strict';

import GameBattleCoordinator from '../../../dist/systems/game/runtime/GameBattleCoordinator.js';

function createCoordinator() {
  const calls = {
    updateBattleMode: 0,
  };

  const coordinator = new GameBattleCoordinator(
    { wasActionPressed: () => false },
    { transition: () => {}, isInState: () => true },
    {
      player: {},
      battleMap: { clearSelectedCell: () => {}, setup: () => {} },
      turnManager: { initializeTurns: () => {}, waitingForPlayer: false },
      battleSplash: { showBattleStart: () => {}, showBattleEnd: () => {} },
      hudElements: { modeIndicator: { textContent: '' } },
      battleUI: { sidebar: { classList: { remove: () => {}, add: () => {} } } },
      villageUI: {
        sidebar: { classList: { add: () => {} } },
        actions: { classList: { add: () => {} } },
        rumorsPanel: { classList: { add: () => {} } },
      },
      worldUI: { sidebar: { classList: { add: () => {} } } },
    },
    {
      battlePlayerActionController: {
        updateBattleMode: () => { calls.updateBattleMode += 1; },
        setSelectedEnemy: () => {},
        getSelectedEnemy: () => null,
        updateBattleUI: () => {},
        handleCanvasClick: () => {},
      },
      battleCommandController: {
        clearPendingLoot: () => {},
        resolvePendingLoot: () => {},
        handleAttack: () => {},
        handleDirectionalCombatMove: () => {},
        handleCastSpell: () => {},
        handleFlee: () => {},
        handleWait: () => {},
        handleUseManaPotion: () => {},
        handleUsePotion: () => {},
      },
      battleTurnController: {
        processTurn: () => {},
      },
    },
    {
      onClearBattleLog: () => {},
      onAddBattleLog: () => {},
      onUpdateHUD: () => {},
      onDescribeEncounter: () => 'a test enemy',
      onGameOver: () => {},
      onBattleEnded: () => {},
    },
  );

  return { coordinator, calls };
}

test('GameBattleCoordinator blocks movement input while battle start splash is active', () => {
  const { coordinator, calls } = createCoordinator();

  coordinator.enterBattleMode([], 'grass');
  coordinator.updateBattleMode();

  assert.equal(calls.updateBattleMode, 0);
});

test('GameBattleCoordinator blocks movement input while battle-end splash is active', () => {
  const { coordinator, calls } = createCoordinator();

  coordinator.endBattle('victory');
  coordinator.updateBattleMode();

  assert.equal(calls.updateBattleMode, 0);
});

test('GameBattleCoordinator resumes movement input once player turn is ready', () => {
  const { coordinator, calls } = createCoordinator();

  coordinator.enterBattleMode([], 'grass');
  coordinator.onPlayerTurnReady();
  coordinator.updateBattleMode();

  assert.equal(calls.updateBattleMode, 1);
});
