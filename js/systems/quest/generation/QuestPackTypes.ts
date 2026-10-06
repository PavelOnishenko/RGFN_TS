import { PackSourceType, QuestNameDomain } from '../QuestTypes.js';

export type FetchLike = (input: string) => Promise<{ text(): Promise<string>; json(): Promise<unknown> }>;
export type AssetMap = Record<string, string[]>;
export type PackSource = {
    type: PackSourceType;
    domain: QuestNameDomain;
    available: boolean;
    generate(limit: number): Promise<string[]>;
};

export type CountryRecord = {
    name?: { common?: string };
    capital?: string[];
    region?: string;
    subregion?: string;
};

export type RandomUserResponse = { results: Array<{ name: { first: string; last: string } }> };
export type LengthWeightMap = Partial<Record<1 | 2 | 3 | 4, number>>;

export const ASSET_PATHS = {
    ADJECTIVE: '../../../../data/quest-packs/common/adjectives.txt',
    NOUN: '../../../../data/quest-packs/common/nouns.txt',
    PREPOSITION: '../../../../data/quest-packs/common/prepositions.txt',
    WEAPON: '../../../../data/quest-packs/common/weapons.txt',
    GIVEN: '../../../../data/quest-packs/people/given.txt',
    FAMILY: '../../../../data/quest-packs/people/family.txt',
    ROLE: '../../../../data/quest-packs/people/trader_roles.txt',
    SPECIES: '../../../../data/quest-packs/monsters/species.txt',
} as const;

export const PLACE_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion';
export const NAME_URL = 'https://randomuser.me/api/?inc=name&noinfo&results=1';
export const ECHO_SYLLABLES = ['va', 'lor', 'quin', 'esh', 'dra', 'morn', 'lys', 'tor', 'zen', 'ka'];
export const DOMAINS: QuestNameDomain[] = ['location', 'artifact', 'character', 'monster', 'mainQuest'];
