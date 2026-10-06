import test from 'node:test';
import assert from 'node:assert/strict';

import QuestPackService from '../../dist/systems/quest/generation/QuestPackService.js';
import { createFetchStub, ScriptedQuestRandom } from '../helpers/questTestDoubles.js';

const FILES = {
  adjectives: 'ashen broken crimson',
  nouns: 'causeway orchard chapel',
  prepositions: 'beyond under within',
  weapons: 'blade spear torch',
  given: 'lena orik tala',
  family: 'vale thorn dusk',
  trader_roles: 'broker courier healer',
  species: 'wyrm ghast fiend',
};

function createFileReader() {
  return async (path) => {
    const key = Object.keys(FILES).find(name => path.includes(name));
    return FILES[key];
  };
}

test('QuestPackService falls back to local and echo sources when remote APIs are unavailable', async () => {
  const random = new ScriptedQuestRandom({ ints: [95], picks: ['local-pattern', ['ADJECTIVE', 'NOUN', 'PREPOSITION'], 'ashen', 'causeway', 'beyond'] });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': new Error('offline'),
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('location', 4);

  assert.equal(result.text.split(' ').length, 3);
  assert.equal(result.sourceTypes.every(type => type === 'local-pattern'), true);
  assert.equal(result.text.includes('Causeway'), true);
});

test('QuestPackService uses remote location packs only after successful availability checks', async () => {
  const random = new ScriptedQuestRandom({
    ints: [60],
    picks: [
      { common: 'glass harbor' },
      'glass harbor',
      'remote-location',
      { common: 'glass harbor' },
      'glass harbor',
    ],
  });
  const fetchImpl = createFetchStub({
    'restcountries.com': [{ name: { common: 'glass harbor' }, capital: ['mist bay'], region: 'north reach', subregion: 'inner rim' }],
    'randomuser.me': new Error('offline'),
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('location', 3);

  assert.equal(result.text, 'Glass Harbor');
  assert.deepEqual(result.sourceTypes, ['remote-location']);
});

test('QuestPackService can use the remote name source for character packs', async () => {
  const random = new ScriptedQuestRandom({ ints: [90], picks: ['remote-name'] });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': { results: [{ name: { first: 'Mira', last: 'Stone' } }] },
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('character', 3);

  assert.equal(result.text, 'Mira Stone');
  assert.deepEqual(result.sourceTypes, ['remote-name']);
});

test('QuestPackService prefers real world-map village names for quest locations when provided', async () => {
  const random = new ScriptedQuestRandom({ ints: [1], picks: ['map-village', 'Oakford'] });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': new Error('offline'),
  });
  const service = new QuestPackService({
    fetchImpl,
    random,
    fileReader: createFileReader(),
    locationNamesProvider: () => ['Oakford', 'Silverbrook'],
  });

  const result = await service.generateName('location', 4);

  assert.equal(result.text, 'Oakford');
  assert.deepEqual(result.sourceTypes, ['map-village']);
});

test('QuestPackService applies configured weighted word lengths so 4-word names remain possible but rare', async () => {
  const random = new ScriptedQuestRandom({
    ints: [100],
    picks: [
      'local-pattern',
      ['NOUN', 'PREPOSITION', 'NOUN'],
      'causeway',
      'beyond',
      'orchard',
      'local-pattern',
      ['NOUN'],
      'chapel',
    ],
  });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': new Error('offline'),
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('artifact', 4);

  assert.equal(result.text.split(' ').length, 4);
  assert.equal(result.sourceTypes.every(type => type === 'local-pattern'), true);
});

test('QuestPackService ignores HTML/error payload tokens in local asset files', async () => {
  const random = new ScriptedQuestRandom({
    ints: [95],
    picks: ['local-pattern', ['ROLE'], 'courier'],
  });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': new Error('offline'),
  });
  const fileReader = async (path) => {
    if (path.includes('trader_roles')) {
      return '<pre>Cannot\\nAcquire <pre>Cannot from /rgfn_game/dist/data/quest-Packs/people/given.txt</pre> courier';
    }
    return createFileReader()(path);
  };
  const service = new QuestPackService({ fetchImpl, random, fileReader });

  const result = await service.generateName('character', 1);

  assert.equal(result.text, 'Courier');
  assert.equal(result.text.includes('Cannot'), false);
  assert.equal(result.text.includes('rgfn_game'), false);
});

test('QuestPackService performs initialization once when multiple generateName calls start concurrently', async () => {
  const random = new ScriptedQuestRandom({
    ints: [95, 95, 95],
    picks: [
      'local-pattern',
      ['GIVEN'],
      'lena',
      'local-pattern',
      ['GIVEN'],
      'orik',
      'local-pattern',
      ['GIVEN'],
      'tala',
    ],
  });
  const fetchCalls = [];
  const fetchImpl = async (input) => {
    fetchCalls.push(String(input));
    throw new Error('offline');
  };
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const results = await Promise.all([
    service.generateName('character', 2),
    service.generateName('character', 2),
    service.generateName('character', 2),
  ]);

  assert.equal(results.length, 3);
  assert.equal(service['sources'].length, 14);
  assert.equal(fetchCalls.length >= 3 && fetchCalls.length <= 4, true);
});
