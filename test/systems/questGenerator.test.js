import test from 'node:test';
import assert from 'node:assert/strict';

import QuestGenerator from '../../dist/systems/quest/QuestGenerator.js';
import QuestLeafFactory from '../../dist/systems/quest/generation/QuestLeafFactory.js';
import { FakeQuestPackService, ScriptedQuestRandom } from '../helpers/questTestDoubles.js';

function createNames() {
  return {
    mainQuest: ['Path Of Embers'],
    location: ['Old Well', 'Fog Chapel', 'Stone Causeway', 'Burnt Orchard'],
    artifact: ['Moon Vial', 'Warden Seal', 'Amber Sigil'],
    character: ['Mira Vale', 'Nomad Broker', 'Orik Thorn'],
    monster: ['Rift Wyrm', 'Ash Ghast', 'Void Fiend'],
  };
}

test('QuestGenerator creates a random main quest title and nested branches', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({ ints: [2, 2], bools: [true, false, false], picks: ['Purge Route', 'travel', 'barter'] });
  const generator = new QuestGenerator({ packService, random });

  const quest = await generator.generateMainQuest();

  assert.equal(quest.title, 'Path Of Embers');
  assert.equal(quest.children.length, 2);
  assert.equal(quest.children[0].children.length, 2);
  assert.equal(quest.children[0].children[0].children.length, 0);
  assert.equal(quest.children[0].children[1].children.length, 0);
  assert.equal(typeof quest.children[0].children[0].title, 'string');
  assert.equal(typeof quest.children[0].children[1].title, 'string');
});

test('QuestGenerator and QuestLeafFactory request name generation with configured max word limits', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({ ints: [1], bools: [false], picks: ['barter'] });
  const generator = new QuestGenerator({ packService, random });

  await generator.generateMainQuest();

  assert.equal(packService.calls.some((call) => call.domain === 'mainQuest' && call.maxWords === 4), true);
  assert.equal(packService.calls.some((call) => call.domain === 'character' && call.maxWords === 4), true);
  assert.equal(packService.calls.some((call) => call.domain === 'artifact' && call.maxWords === 4), true);
});

test('QuestLeafFactory creates rare mutant hunt quests with stats, effects, and bonus text', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({ ints: [2], picks: ['hunt', 'feral strength', 'void armor', 'causes fear', 'drains mana', 'legendary reagent drop'] });
  const factory = new QuestLeafFactory(packService, random);

  const node = await factory.create('main.1');

  assert.equal(node.objectiveType, 'hunt');
  assert.match(node.title, /Hunt Rift Wyrm/);
  assert.match(node.description, /Stats: feral strength, void armor/);
  assert.match(node.description, /Effects: causes fear, drains mana/);
  assert.match(node.description, /Bonus: legendary reagent drop/);
});

test('QuestLeafFactory supports the four added leaf quest types', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({
    ints: [1],
    picks: ['recover', 'escort', 'defend', 'travel'],
  });
  const factory = new QuestLeafFactory(packService, random);

  const recover = await factory.create('main.1');
  const escort = await factory.create('main.2');
  const defend = await factory.create('main.3');
  const travel = await factory.create('main.4');

  assert.equal(recover.objectiveType, 'recover');
  assert.match(recover.conditionText, /Obtain/);
  assert.equal(escort.objectiveType, 'escort');
  assert.match(escort.conditionText, /alive/);
  assert.equal(defend.objectiveType, 'defend');
  assert.match(defend.conditionText, /Prevent the fall/);
  assert.equal(travel.objectiveType, 'travel');
});

test('QuestLeafFactory can create side-only local objective types', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({
    ints: [3, 2],
    picks: ['localDelivery', 'Ration Crate', 'gather', 'Medicinal Herbs', 'repair', 'Well Pump', 'Timber', 'Canvas', 'patrol', 'North Gate', 'South Wall'],
  });
  const factory = new QuestLeafFactory(packService, random);
  const context = { villageName: 'Ashford', giverNpcName: 'Mira' };

  const localDelivery = await factory.createSide('side.1', context);
  const gather = await factory.createSide('side.2', context);
  const repair = await factory.createSide('side.3', context);
  const patrol = await factory.createSide('side.4', context);

  assert.equal(localDelivery.objectiveType, 'localDelivery');
  assert.equal(localDelivery.objectiveData.localDelivery.villageName, 'Ashford');
  assert.equal(localDelivery.objectiveData.localDelivery.sourceNpcName, 'Mira');
  assert.equal(gather.objectiveType, 'gather');
  assert.equal(gather.objectiveData.gather.villageName, 'Ashford');
  assert.equal(repair.objectiveType, 'repair');
  assert.equal(repair.objectiveData.repair.villageName, 'Ashford');
  assert.equal(patrol.objectiveType, 'patrol');
  assert.equal(patrol.objectiveData.patrol.villageName, 'Ashford');
});

test('QuestLeafFactory delivery quests include pickup source person and village in text and objective data', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({ picks: ['deliver'] });
  const factory = new QuestLeafFactory(packService, random);

  const deliver = await factory.create('main.9');

  assert.equal(deliver.objectiveType, 'deliver');
  assert.match(deliver.description, /from/);
  assert.match(deliver.description, /then carry it to/);
  assert.equal(typeof deliver.objectiveData?.deliver?.sourceVillage, 'string');
  assert.equal(typeof deliver.objectiveData?.deliver?.sourceTrader, 'string');
  assert.equal(typeof deliver.objectiveData?.deliver?.destinationVillage, 'string');
});
test('QuestLeafFactory purge objectives include anchored village intel and monster profile data', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({
    ints: [2],
    bools: [true],
    picks: ['eliminate', 'wolf', 'acid blood', 'grave intellect'],
  });
  const factory = new QuestLeafFactory(packService, random);

  const node = await factory.create('main.9');

  assert.equal(node.objectiveType, 'eliminate');
  assert.match(node.description, /mutated from wolf/i);
  assert.match(node.description, /acid blood/i);
  assert.match(node.conditionText, /near Old Well/);
  assert.equal(node.entities.some((entity) => entity.type === 'monster' && entity.text === 'Rift Wyrm'), true);
  assert.equal(node.objectiveData?.monster?.villageName, 'Old Well');
});

test('QuestGenerator creates side quests with reward metadata claimable on giver turn-in', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({ ints: [24, 35], picks: ['localDelivery', 'Ration Crate', 'Nomad Broker', 'Scout Charm'] });
  const generator = new QuestGenerator({ packService, random });

  const sideQuest = await generator.generateSideQuest('side.99', 'Mira Vale', 'Old Well');

  assert.equal(sideQuest.track, 'side');
  assert.equal(sideQuest.giverNpcName, 'Mira Vale');
  assert.equal(sideQuest.giverVillageName, 'Old Well');
  assert.equal(sideQuest.status, 'available');
  assert.equal(sideQuest.children.length, 1);
  assert.equal(sideQuest.children[0].objectiveType, 'localDelivery');
  assert.equal(sideQuest.rewardMetadata.requiresTurnIn, true);
  assert.equal(sideQuest.rewardMetadata.xp, 24);
  assert.equal(sideQuest.rewardMetadata.gold, 35);
  assert.match(sideQuest.reward, /24 XP, 35g/);
});

test('QuestGenerator constrains side quest villages to nearby candidates and injects direction hints in objective text', async () => {
  const packService = new FakeQuestPackService(createNames());
  const random = new ScriptedQuestRandom({
    ints: [18, 22],
    picks: ['travel', 'Fog Chapel', 'Repair Kit'],
  });
  const generator = new QuestGenerator({
    packService,
    random,
    nearbyVillagesProvider: () => [
      { name: 'Fog Chapel', distanceCells: 3 },
      { name: 'Stone Causeway', distanceCells: 7 },
    ],
    villageDirectionHintProvider: (villageName) => {
      if (villageName === 'Fog Chapel') {
        return { settlementName: villageName, exists: true, direction: 'north-east', distanceCells: 3 };
      }
      if (villageName === 'Stone Causeway') {
        return { settlementName: villageName, exists: true, direction: 'east', distanceCells: 7 };
      }
      return { settlementName: villageName, exists: true, direction: 'north', distanceCells: 0 };
    },
  });

  const sideQuest = await generator.generateSideQuest('side.101', 'Mira Vale', 'Old Well');

  assert.equal(sideQuest.children[0].objectiveType, 'travel');
  assert.equal(sideQuest.children[0].entities.some((entity) => entity.type === 'location' && entity.text === 'Fog Chapel'), true);
  assert.match(sideQuest.children[0].description, /Fog Chapel \(north-east, 3 cells\)/);
  assert.equal(sideQuest.children[0].entities.some((entity) => entity.type === 'location' && entity.text === 'Burnt Orchard'), false);
});
