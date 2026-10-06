import test from 'node:test';
import assert from 'node:assert/strict';

import EncounterSystem from '../../dist/systems/encounter/EncounterSystem.js';
import Skeleton from '../../dist/entities/Skeleton.js';
import { MonsterMutationEngine } from '../../dist/entities/monster/MonsterMutationEngine.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';
import { withPatchedProperty, withPatchedMethod, withFixedRandom } from '../helpers/testUtils.js';

function setupEventType(encounters, eventType) {
  encounters.rollEncounterEventType = () => eventType;
}

function setupEncounterType(encounters, encounterType) {
  encounters.rollEncounterType = () => encounterType;
}

function setupDragonPassingCheck(doesPass) {
  return withPatchedMethod(MonsterMutationEngine, 'shouldPassEncounter', () => doesPass);
}

test('EncounterSystem checkEncounter uses discovered tile rate override', () => {
  const encounters = new EncounterSystem(0);

  const none = encounters.checkEncounter(false);
  const discovered = withPatchedProperty(
    balanceConfig.encounters,
    'discoveredEncounterRate',
    1,
    () => encounters.checkEncounter(true)
  );

  assert.equal(none, false);
  assert.equal(discovered, true);
});

test('EncounterSystem can generate item discovery encounters repeatedly', () => {
  const encounters = new EncounterSystem(1);

  const [first, second] = withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    encounters.queueForcedEncounter('item');
    encounters.queueForcedEncounter('item');
    return [encounters.generateEncounter(), encounters.generateEncounter()];
  });

  assert.equal(first.type, 'item');
  assert.equal(second.type, 'item');
  assert.equal(typeof first.item.id, 'string');
  assert.equal(typeof second.item.id, 'string');
});

test('EncounterSystem item pool can include configured melee weapons', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 1, () => (
    withFixedRandom(0.2, () => encounters.generateEncounter())
  ));

  assert.equal(result.type, 'item');
  assert.equal(result.item.type === 'weapon' || result.item.type === 'armor' || result.item.type === 'consumable', true);
});


test('EncounterSystem blocks item discoveries when discovery is disabled for known tiles', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 1, () => {
    setupEventType(encounters, 'item');
    setupEncounterType(encounters, 'skeleton');
    return encounters.generateEncounter(false);
  });

  assert.notEqual(result.type, 'item');
});

test('EncounterSystem never creates village encounter results (villages are map-generated only)', () => {
  const encounters = new EncounterSystem(1);
  const generatedTypes = new Set();

  withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    for (let i = 0; i < 80; i += 1) {
      generatedTypes.add(encounters.generateEncounter(true).type);
    }
  });

  assert.equal(generatedTypes.has('village'), false);
});

test('EncounterSystem handles dragon pass encounter branch', () => {
  const encounters = new EncounterSystem(1);

  withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    setupEventType(encounters, 'monster');
    setupEncounterType(encounters, 'dragon');

    setupDragonPassingCheck(true)(() => {
      const result = encounters.generateEncounter();
      assert.equal(result.type, 'none');
    });
  });
});

test('EncounterSystem can generate grouped enemies', () => {
  const encounters = new EncounterSystem(1);

  withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    setupEventType(encounters, 'monster');
    setupEncounterType(encounters, 'skeleton');

    const skeletonBattle = encounters.generateEncounter();

    assert.equal(skeletonBattle.type, 'battle');
    assert.equal(
      skeletonBattle.enemies.length >= balanceConfig.encounters.minEnemies &&
      skeletonBattle.enemies.length <= balanceConfig.encounters.maxEnemies,
      true
    );
  });
});


test('EncounterSystem can generate traveler encounter', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    encounters.queueForcedEncounter('traveler');
    return encounters.generateEncounter();
  });

  assert.equal(result.type, 'traveler');
  assert.equal(result.traveler.level >= 1, true);
});

test('EncounterSystem skips random encounters when all encounter types are disabled', () => {
  const encounters = new EncounterSystem(1);

  encounters.setAllEncounterTypesEnabled(false);

  const result = encounters.generateEncounter();

  assert.equal(result.type, 'none');
});

test('EncounterSystem can disable item encounters while keeping monster battles enabled', () => {
  const encounters = new EncounterSystem(1);

  encounters.setEncounterTypeEnabled('item', false);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 1, () => {
    setupEventType(encounters, 'monster');
    setupEncounterType(encounters, 'skeleton');
    return encounters.generateEncounter();
  });

  assert.equal(result.type, 'battle');
});

test('EncounterSystem exposes current encounter type toggle states', () => {
  const encounters = new EncounterSystem(1);

  encounters.setAllEncounterTypesEnabled(false);
  encounters.setEncounterTypeEnabled('traveler', true);

  const states = encounters.getEncounterTypeStates();

  assert.deepEqual(states, {
    monster: false,
    item: false,
    traveler: true,
  });
});

test('EncounterSystem generateMonsterBattleEncounter returns a battle when resolver returns monster battle', () => {
  const encounters = new EncounterSystem(1);

  const result = encounters.generateMonsterBattleEncounter();

  assert.equal(result.type, 'battle');
  assert.equal(Array.isArray(result.enemies), true);
});

test('EncounterSystem generateMonsterBattleEncounter throws when resolver returns a non-battle result', () => {
  const encounters = new EncounterSystem(1);

  const thrown = withPatchedProperty(encounters, 'encounterResolver', {
    generateEncounter: () => ({ type: 'none' }),
  }, () => {
    try {
      encounters.generateMonsterBattleEncounter();
      return null;
    } catch (error) {
      return error;
    }
  });

  assert.equal(thrown instanceof Error, true);
  assert.match(String(thrown?.message ?? ''), /Expected monster ambush to produce battle encounter/);
});
