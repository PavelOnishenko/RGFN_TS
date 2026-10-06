import test from 'node:test';
import assert from 'node:assert/strict';

import VillageDialogueEngine from '../../../dist/systems/village/VillageDialogueEngine.js';

test('VillageDialogueEngine truthful NPC gives truthful answer for known settlement', () => {
  const engine = new VillageDialogueEngine();
  const result = engine.buildLocationAnswer(
    {
      id: 'npc-1',
      name: 'Mara',
      role: 'Trader',
      look: 'travel cloak',
      speechStyle: 'warm and direct',
      disposition: 'truthful',
    },
    {
      settlementName: 'Stonehaven',
      exists: true,
      direction: 'north',
      distanceCells: 8,
    },
  );

  assert.equal(result.truthfulness, 'truth');
  assert.match(result.speech, /north/i);
});

test('VillageDialogueEngine liar NPC points opposite direction', () => {
  const engine = new VillageDialogueEngine();
  const result = engine.buildLocationAnswer(
    {
      id: 'npc-2',
      name: 'Tor',
      role: 'Guard',
      look: 'old armor',
      speechStyle: 'cold and formal',
      disposition: 'liar',
    },
    {
      settlementName: 'Sunford',
      exists: true,
      direction: 'east',
      distanceCells: 10,
    },
  );

  assert.equal(result.truthfulness, 'lie');
  assert.match(result.speech, /west/i);
});

test('VillageDialogueEngine silent NPC refuses to answer', () => {
  const engine = new VillageDialogueEngine();
  const result = engine.buildLocationAnswer(
    {
      id: 'npc-3',
      name: 'Nira',
      role: 'Herbalist',
      look: 'satchel',
      speechStyle: 'calm and measured',
      disposition: 'silent',
    },
    {
      settlementName: 'Unknown',
      exists: false,
    },
  );

  assert.equal(result.truthfulness, 'refusal');
});

test('VillageDialogueEngine nearby settlements answer respects NPC knowledge radius', () => {
  const engine = new VillageDialogueEngine();
  const result = engine.buildNearbySettlementsAnswer(
    {
      id: 'npc-4',
      name: 'Bram',
      role: 'Hunter',
      look: 'travel cloak',
      speechStyle: 'warm and direct',
      disposition: 'truthful',
      settlementKnowledgeRadiusCells: 8,
    },
    [
      { settlementName: 'Farwatch', exists: true, direction: 'east', distanceCells: 6 },
      { settlementName: 'Longford', exists: true, direction: 'south', distanceCells: 20 },
    ],
    'Mossbrook',
  );

  assert.equal(result.truthfulness, 'truth');
  assert.match(result.speech, /Farwatch/i);
  assert.doesNotMatch(result.speech, /Longford/i);
});
