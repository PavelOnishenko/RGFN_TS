import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/player/Player.js';
import MagicSystem from '../../dist/systems/controllers/magic/MagicSystem.js';

test('MagicSystem exposes highest defined spell tier when invested level exceeds spellbook', () => {
  const player = new Player(0, 0);
  player.magicPoints = 5;
  player.mana = 10;

  const magicSystem = new MagicSystem(player);
  for (let i = 0; i < 5; i += 1) {
    assert.equal(magicSystem.investSpellPoint('slow'), true);
  }

  const availableSpells = magicSystem.getAvailableSpells();
  const slowSpell = availableSpells.find((spell) => spell.id.startsWith('slow-lvl-'));

  assert.ok(slowSpell);
  assert.equal(slowSpell.id, 'slow-lvl-2');

  const mockTarget = {
    applySlow: () => {},
  };

  const result = magicSystem.castSpell('slow', mockTarget);
  assert.equal(result.ok, true);
  assert.match(result.message, /Slow II cast/);
});
