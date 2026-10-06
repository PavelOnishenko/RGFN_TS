import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSideQuestRewardMetadata } from '../../dist/systems/quest/QuestRewardResolver.js';

test('resolveSideQuestRewardMetadata prefers explicit metadata when present', () => {
  const resolved = resolveSideQuestRewardMetadata(
    { xp: 17, gold: 33, itemName: 'Scout Charm', requiresTurnIn: true },
    '99 XP, 99g, Not used'
  );

  assert.equal(resolved?.xp, 17);
  assert.equal(resolved?.gold, 33);
  assert.equal(resolved?.itemName, 'Scout Charm');
});

test('resolveSideQuestRewardMetadata parses legacy reward strings', () => {
  const resolved = resolveSideQuestRewardMetadata(undefined, '21 XP, 29g, Hunter Tonic');

  assert.equal(resolved?.xp, 21);
  assert.equal(resolved?.gold, 29);
  assert.equal(resolved?.itemName, 'Hunter Tonic');
  assert.equal(resolved?.requiresTurnIn, true);
});

test('resolveSideQuestRewardMetadata returns null when reward text does not include XP and gold', () => {
  const resolved = resolveSideQuestRewardMetadata(undefined, 'Unknown reward');
  assert.equal(resolved, null);
});
