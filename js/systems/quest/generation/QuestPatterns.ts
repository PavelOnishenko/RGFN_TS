import { QuestNameDomain } from '../QuestTypes.js';

type Token = 'ADJECTIVE' | 'NOUN' | 'PREPOSITION' | 'WEAPON' | 'GIVEN' | 'FAMILY' | 'ROLE' | 'SPECIES';

export type LocalPattern = {
    domain: QuestNameDomain;
    tokens: Token[];
};

const LOCATION_PATTERNS: LocalPattern[] = [
    { domain: 'location', tokens: ['NOUN'] },
    { domain: 'location', tokens: ['ADJECTIVE', 'NOUN'] },
    { domain: 'location', tokens: ['WEAPON', 'PREPOSITION', 'NOUN'] },
    { domain: 'location', tokens: ['NOUN', 'PREPOSITION', 'NOUN'] },
    { domain: 'location', tokens: ['ADJECTIVE', 'WEAPON'] },
    { domain: 'location', tokens: ['WEAPON', 'NOUN'] },
    { domain: 'location', tokens: ['ADJECTIVE', 'PREPOSITION', 'NOUN'] },
    { domain: 'location', tokens: ['NOUN', 'WEAPON'] },
    { domain: 'location', tokens: ['ADJECTIVE', 'NOUN', 'NOUN'] },
    { domain: 'location', tokens: ['WEAPON'] },
    { domain: 'location', tokens: ['ADJECTIVE', 'NOUN', 'PREPOSITION', 'NOUN'] },
    { domain: 'location', tokens: ['WEAPON', 'NOUN', 'PREPOSITION', 'NOUN'] },
];

const ARTIFACT_PATTERNS: LocalPattern[] = [
    { domain: 'artifact', tokens: ['NOUN'] },
    { domain: 'artifact', tokens: ['ADJECTIVE', 'NOUN'] },
    { domain: 'artifact', tokens: ['WEAPON', 'NOUN'] },
    { domain: 'artifact', tokens: ['ADJECTIVE', 'WEAPON'] },
    { domain: 'artifact', tokens: ['NOUN', 'PREPOSITION', 'NOUN'] },
    { domain: 'artifact', tokens: ['WEAPON'] },
    { domain: 'artifact', tokens: ['ADJECTIVE', 'NOUN', 'NOUN'] },
    { domain: 'artifact', tokens: ['NOUN', 'WEAPON'] },
    { domain: 'artifact', tokens: ['ADJECTIVE', 'PREPOSITION', 'WEAPON'] },
    { domain: 'artifact', tokens: ['WEAPON', 'PREPOSITION', 'NOUN'] },
];

const CHARACTER_PATTERNS: LocalPattern[] = [
    { domain: 'character', tokens: ['GIVEN'] },
    { domain: 'character', tokens: ['GIVEN', 'FAMILY'] },
    { domain: 'character', tokens: ['ROLE'] },
    { domain: 'character', tokens: ['GIVEN', 'ROLE'] },
    { domain: 'character', tokens: ['ROLE', 'FAMILY'] },
    { domain: 'character', tokens: ['GIVEN', 'FAMILY', 'ROLE'] },
    { domain: 'character', tokens: ['GIVEN', 'GIVEN'] },
    { domain: 'character', tokens: ['FAMILY'] },
    { domain: 'character', tokens: ['ROLE', 'ROLE'] },
    { domain: 'character', tokens: ['GIVEN', 'FAMILY', 'FAMILY'] },
];

const MONSTER_PATTERNS: LocalPattern[] = [
    { domain: 'monster', tokens: ['SPECIES'] },
    { domain: 'monster', tokens: ['ADJECTIVE', 'SPECIES'] },
    { domain: 'monster', tokens: ['SPECIES', 'PREPOSITION', 'NOUN'] },
    { domain: 'monster', tokens: ['ADJECTIVE', 'SPECIES', 'SPECIES'] },
    { domain: 'monster', tokens: ['WEAPON', 'SPECIES'] },
    { domain: 'monster', tokens: ['NOUN', 'SPECIES'] },
    { domain: 'monster', tokens: ['ADJECTIVE', 'PREPOSITION', 'SPECIES'] },
    { domain: 'monster', tokens: ['SPECIES', 'NOUN'] },
    { domain: 'monster', tokens: ['ADJECTIVE', 'NOUN', 'SPECIES'] },
    { domain: 'monster', tokens: ['SPECIES', 'SPECIES'] },
];

const MAIN_QUEST_PATTERNS: LocalPattern[] = [
    { domain: 'mainQuest', tokens: ['NOUN'] },
    { domain: 'mainQuest', tokens: ['ADJECTIVE', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['WEAPON', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['ADJECTIVE', 'WEAPON'] },
    { domain: 'mainQuest', tokens: ['NOUN', 'PREPOSITION', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['ADJECTIVE', 'NOUN', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['WEAPON', 'PREPOSITION', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['ADJECTIVE', 'PREPOSITION', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['ADJECTIVE', 'WEAPON', 'NOUN'] },
    { domain: 'mainQuest', tokens: ['NOUN', 'WEAPON', 'NOUN'] },
];

export const LOCAL_PATTERNS = [...LOCATION_PATTERNS, ...ARTIFACT_PATTERNS, ...CHARACTER_PATTERNS, ...MONSTER_PATTERNS, ...MAIN_QUEST_PATTERNS];
