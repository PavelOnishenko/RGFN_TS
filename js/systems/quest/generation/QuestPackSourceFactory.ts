import { LOCAL_PATTERNS } from './QuestPatterns.js';
import { QuestRandom } from './QuestRandom.js';
import { QuestNameDomain } from '../QuestTypes.js';
import { CountryRecord, ECHO_SYLLABLES, FetchLike, NAME_URL, PLACE_URL, PackSource, RandomUserResponse } from './QuestPackTypes.js';

type SourceFactoryDeps = {
    fetchImpl: FetchLike;
    random: QuestRandom;
    assets: Record<string, string[]>;
    locationNamesProvider: () => string[] | Promise<string[]>;
};

export class QuestPackSourceFactory {
    constructor(private readonly deps: SourceFactoryDeps) {}

    public createLocalSource = (domain: QuestNameDomain): PackSource => ({
        type: 'local-pattern', domain, available: true, generate: (limit) => this.localPack(domain, limit),
    });

    public createEchoSource = (domain: QuestNameDomain): PackSource => ({
        type: 'echo', domain, available: true, generate: (limit) => Promise.resolve(this.echoPack(limit)),
    });

    public createMapVillageSource = (): PackSource => ({ type: 'map-village', domain: 'location', available: true, generate: () => this.mapVillagePack() });

    public createLocationSource = (): PackSource => ({ type: 'remote-location', domain: 'location', available: false, generate: () => this.fetchLocationPack() });

    public createNameSource = (domain: QuestNameDomain): PackSource => ({ type: 'remote-name', domain, available: false, generate: (limit) => this.fetchName(limit) });

    private async localPack(domain: QuestNameDomain, limit: number): Promise<string[]> {
        const options = LOCAL_PATTERNS.filter((item) => item.domain === domain && item.tokens.length <= limit);
        const pattern = this.deps.random.pick(options);
        return pattern.tokens.map((token) => this.deps.random.pick(this.deps.assets[token]));
    }

    private async mapVillagePack(): Promise<string[]> {
        const villageNames = (await this.deps.locationNamesProvider()).map((name) => name.trim()).filter(Boolean);
        if (villageNames.length === 0) {
            return [];
        }
        const selected = this.deps.random.pick(villageNames);
        return selected ? [selected] : [];
    }

    private async fetchLocationPack(): Promise<string[]> {
        const response = await this.deps.fetchImpl(PLACE_URL);
        const sample = this.deps.random.pick(await response.json() as CountryRecord[]);
        const choices = [sample.name?.common, sample.capital?.[0], sample.subregion, sample.region].filter(Boolean) as string[];
        return this.wordList(this.deps.random.pick(choices)).slice(0, 3);
    }

    private async fetchName(limit: number): Promise<string[]> {
        const response = await this.deps.fetchImpl(NAME_URL);
        const data = await response.json() as RandomUserResponse;
        const name = data.results[0].name;
        return [name.first, name.last].map((part) => part.toLowerCase()).slice(0, limit);
    }

    private echoPack = (limit: number): string[] => Array.from(
        { length: Math.max(1, limit) },
        () => `${this.deps.random.pick(ECHO_SYLLABLES)}${this.deps.random.pick(ECHO_SYLLABLES)}`,
    );

    private wordList = (text: string): string[] => text.split(/\s+/).map((word) => word.trim()).filter(Boolean);
}
