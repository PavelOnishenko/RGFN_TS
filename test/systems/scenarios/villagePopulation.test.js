import test from 'node:test';
import assert from 'node:assert/strict';

import VillagePopulation from '../../../dist/systems/village/VillagePopulation.js';
import { withMockedRandom } from '../../helpers/testUtils.js';

const SPOTS = [
  { x: 100, y: 200 },
  { x: 180, y: 260 },
  { x: 260, y: 220 },
  { x: 340, y: 280 },
];

test('VillagePopulation reuses villagers for the same village across re-entry', () => withMockedRandom([0.12, 0.33, 0.57, 0.79], () => {
  const population = new VillagePopulation();

  population.initialize(SPOTS, 10, 'Oakford');
  const firstVisitVillagers = population.getVillagers().map((villager) => ({
    shirtColor: villager.shirtColor,
    pantsColor: villager.pantsColor,
    fromSpot: villager.fromSpot,
    toSpot: villager.toSpot,
    propSwingOffset: villager.propSwingOffset,
    armSwingOffset: villager.armSwingOffset,
  }));

  population.initialize(SPOTS, 99, 'Oakford');
  const secondVisitVillagers = population.getVillagers().map((villager) => ({
    shirtColor: villager.shirtColor,
    pantsColor: villager.pantsColor,
    fromSpot: villager.fromSpot,
    toSpot: villager.toSpot,
    propSwingOffset: villager.propSwingOffset,
    armSwingOffset: villager.armSwingOffset,
  }));

  assert.deepEqual(secondVisitVillagers, firstVisitVillagers);
}));

test('VillagePopulation keeps different villagers per village id', () => withMockedRandom([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65], () => {
  const population = new VillagePopulation();

  population.initialize(SPOTS, 10, 'Oakford');
  const oakfordSignature = population.getVillagers().map((villager) => `${villager.shirtColor}-${villager.propSwingOffset}`);

  population.initialize(SPOTS, 10, 'Stonehaven');
  const stonehavenSignature = population.getVillagers().map((villager) => `${villager.shirtColor}-${villager.propSwingOffset}`);

  assert.notDeepEqual(stonehavenSignature, oakfordSignature);

  population.initialize(SPOTS, 12, 'Oakford');
  const oakfordReturnSignature = population.getVillagers().map((villager) => `${villager.shirtColor}-${villager.propSwingOffset}`);

  assert.deepEqual(oakfordReturnSignature, oakfordSignature);
}));
