import test from 'node:test';
import assert from 'node:assert/strict';

import BattleMap from '../../dist/systems/combat/BattleMap.js';
import { createCombatEntity, createMockCanvasContext } from '../helpers/testUtils.js';

test('BattleMap setup positions player and enemies on grid', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const enemies = [createCombatEntity('Skeleton', 0, 0, false), createCombatEntity('Zombie', 0, 0, false)];

  map.setup(player, enemies);

  assert.equal(player.gridRow, 6);
  assert.equal(enemies[0].gridRow, 1);
  assert.equal(enemies[1].gridCol - enemies[0].gridCol, 2);
});

test('BattleMap range checks use Manhattan distance', () => {
  const map = new BattleMap();
  const a = createCombatEntity('Player', 2, 2, false);
  const b = createCombatEntity('Skeleton', 2, 3, false);

  assert.equal(map.isInMeleeRange(a, b), true);
  assert.equal(map.isInAttackRange(a, b, 1), true);
  assert.equal(map.isInAttackRange(a, createCombatEntity('Skeleton', 2, 5, false), 2), false);
});

test('BattleMap movement fails when blocked and succeeds when an adjacent open tile is available', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const blocker = createCombatEntity('Skeleton', 0, 0, false);
  map.setup(player, [blocker]);

  player.gridCol = 4;
  player.gridRow = 4;
  blocker.gridCol = 5;
  blocker.gridRow = 4;

  assert.equal(map.moveEntity(player, 'right'), false);

  const openDirection = [
    ['left', [3, 4]],
    ['up', [4, 3]],
    ['down', [4, 5]],
  ].find(([, [col, row]]) => !map.isObstacle(col, row));

  assert.ok(openDirection);
  assert.equal(map.moveEntity(player, openDirection[0]), true);
  assert.deepEqual([player.gridCol, player.gridRow], openDirection[1]);
});

test('BattleMap movement allows stepping onto dead entities but not living ones', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const deadSkeleton = createCombatEntity('Skeleton', 0, 0, true);
  const livingZombie = createCombatEntity('Zombie', 0, 0, false);
  map.setup(player, [deadSkeleton, livingZombie]);

  player.gridCol = 4;
  player.gridRow = 4;
  deadSkeleton.gridCol = 5;
  deadSkeleton.gridRow = 4;
  livingZombie.gridCol = 6;
  livingZombie.gridRow = 4;

  assert.equal(map.moveEntity(player, 'right'), true);
  assert.deepEqual([player.gridCol, player.gridRow], [5, 4]);
  assert.equal(map.moveEntity(player, 'right'), false);
  assert.deepEqual([player.gridCol, player.gridRow], [5, 4]);
});

test('BattleMap moveEntityToward prefers primary axis and falls back to alternate', () => {
  const map = new BattleMap();
  const mover = createCombatEntity('Skeleton', 4, 4, false);
  const target = createCombatEntity('Player', 7, 5, false);
  const blockPrimary = createCombatEntity('Zombie', 5, 4, false);

  map.setup(target, [mover, blockPrimary]);
  mover.gridCol = 4;
  mover.gridRow = 4;
  target.gridCol = 7;
  target.gridRow = 5;
  blockPrimary.gridCol = 5;
  blockPrimary.gridRow = 4;

  assert.equal(map.moveEntityToward(mover, target), true);
  assert.deepEqual([mover.gridCol, mover.gridRow], [4, 5]);
});

test('BattleMap moveEntityToward can path around blockers when another route is open', () => {
  const map = new BattleMap();
  const mover = createCombatEntity('Skeleton', 0, 0, false);
  const target = createCombatEntity('Player', 0, 0, false);
  const blockPrimary = createCombatEntity('Zombie', 0, 0, false);
  const blockAlternate = createCombatEntity('Zombie', 0, 0, false);

  map.setup(target, [mover, blockPrimary, blockAlternate]);
  mover.gridCol = 4;
  mover.gridRow = 4;
  target.gridCol = 7;
  target.gridRow = 6;
  blockPrimary.gridCol = 5;
  blockPrimary.gridRow = 4;
  blockAlternate.gridCol = 4;
  blockAlternate.gridRow = 5;

  assert.equal(map.moveEntityToward(mover, target), true);
  assert.ok(
    (mover.gridCol === 4 && mover.gridRow === 3)
    || (mover.gridCol === 3 && mover.gridRow === 4)
  );
});

test('BattleMap moveEntityToward falls back to default origin coordinates when grid positions are missing', () => {
  const map = new BattleMap();
  const mover = createCombatEntity('Skeleton', 0, 0, false);
  const target = createCombatEntity('Player', 96, 96, false);

  map.setup(target, [mover]);

  delete mover.gridCol;
  delete mover.gridRow;
  delete target.gridCol;
  delete target.gridRow;

  assert.equal(map.moveEntityToward(mover, target), true);
  assert.deepEqual([mover.gridCol, mover.gridRow], [1, 0]);
});

test('BattleMap moveEntity prevents moving out of map bounds', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);

  map.setup(player, []);
  player.gridCol = 0;
  player.gridRow = 0;

  assert.equal(map.moveEntity(player, 'up'), false);
  assert.equal(map.moveEntity(player, 'left'), false);
  assert.deepEqual([player.gridCol, player.gridRow], [0, 0]);
});
test('BattleMap isEntityOnEdge returns true only on battle map borders', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const enemy = createCombatEntity('Skeleton', 0, 0, false);
  enemy.hp = 30;
  enemy.maxHp = 45;

  map.setup(player, [enemy]);

  player.gridCol = 0;
  player.gridRow = 3;
  assert.equal(map.isEntityOnEdge(player), true);

  player.gridCol = 4;
  player.gridRow = 0;
  assert.equal(map.isEntityOnEdge(player), true);

  player.gridCol = 9;
  player.gridRow = 6;
  assert.equal(map.isEntityOnEdge(player), true);

  player.gridCol = 4;
  player.gridRow = 7;
  assert.equal(map.isEntityOnEdge(player), true);

  player.gridCol = 4;
  player.gridRow = 4;
  assert.equal(map.isEntityOnEdge(player), false);
});

test('BattleMap draw paints the arena with filled tiles and stroked highlights', () => {
  const map = new BattleMap();
  const ctx = createMockCanvasContext();
  const player = createCombatEntity('Player', 5, 6, false);
  const enemy = createCombatEntity('Skeleton', 5, 1, false);

  map.setup(player, [enemy]);
  map.draw(ctx, null, player, enemy);

  assert.ok(ctx.calls.some(c => c[0] === 'fillRect'));
  assert.ok(ctx.calls.some(c => c[0] === 'fill'));
  assert.ok(ctx.calls.some(c => c[0] === 'stroke'));
});

test('BattleMap exposes selected battle cell info from mouse position', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const enemy = createCombatEntity('Skeleton', 0, 0, false);
  enemy.hp = 30;
  enemy.maxHp = 45;

  map.setup(player, [enemy], 'forest');
  player.gridCol = 4;
  player.gridRow = 4;
  enemy.gridCol = 5;
  enemy.gridRow = 4;
  map.resizeToCanvas(480, 384);

  const selected = map.updateSelectedCellFromPixel((5 * 48) + 24, (4 * 48) + 24);
  assert.equal(selected, true);
  assert.deepEqual(map.getSelectedCellInfo(), {
    mode: 'battle',
    col: 5,
    row: 4,
    terrainType: 'forest',
    obstacleName: null,
    isTraversable: false,
    occupantType: 'enemy',
    occupantName: 'Skeleton',
    occupantHp: 30,
    occupantMaxHp: 45,
  });

  map.clearSelectedCell();
  assert.equal(map.getSelectedCellInfo(), null);
});

test('BattleMap selected cell info prefers enemy display name over constructor name', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const enemy = createCombatEntity('Skeleton', 0, 0, false);
  enemy.name = 'Ninja';
  enemy.hp = 10;
  enemy.maxHp = 10;

  map.setup(player, [enemy], 'grass');
  enemy.gridCol = 5;
  enemy.gridRow = 4;
  map.resizeToCanvas(480, 384);

  const selected = map.updateSelectedCellFromPixel((5 * 48) + 24, (4 * 48) + 24);
  assert.equal(selected, true);

  const info = map.getSelectedCellInfo();
  assert.equal(info?.occupantType, 'enemy');
  assert.equal(info?.occupantName, 'Ninja');
});
