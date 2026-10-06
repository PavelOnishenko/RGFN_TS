import { DefaultQuestRandom, QuestRandom } from './QuestRandom.js';
import { GeneratedName, PackSourceType, QuestNameDomain } from '../QuestTypes.js';
import { ASSET_PATHS, AssetMap, DOMAINS, FetchLike, PackSource } from './QuestPackTypes.js';
import { QuestNameWordTargetSelector } from './QuestNameWordTargetSelector.js';
import { QuestPackSourceFactory } from './QuestPackSourceFactory.js';

type QuestPackServiceDeps = {
    fetchImpl?: FetchLike;
    random?: QuestRandom;
    fileReader?: (path: string) => Promise<string>;
    locationNamesProvider?: () => string[] | Promise<string[]>;
};

export default class QuestPackService {
    private readonly fetchImpl: FetchLike;
    private readonly random: QuestRandom;
    private readonly fileReader: (path: string) => Promise<string>;
    private readonly locationNamesProvider: () => string[] | Promise<string[]>;
    private readonly assets: AssetMap = {};
    private readonly sources: PackSource[] = [];
    private readonly targetSelector: QuestNameWordTargetSelector;
    private initialized = false;
    private initializationPromise: Promise<void> | null = null;

    constructor(deps: QuestPackServiceDeps = {}) {
        this.fetchImpl = deps.fetchImpl ?? ((input: string) => globalThis.fetch(input));
        this.random = deps.random ?? new DefaultQuestRandom();
        this.fileReader = deps.fileReader ?? ((path) => this.readTextAsset(path));
        this.locationNamesProvider = deps.locationNamesProvider ?? (() => []);
        this.targetSelector = new QuestNameWordTargetSelector(this.random);
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        if (!this.initializationPromise) {
            this.initializationPromise = this.runInitialization();
        }
        await this.initializationPromise;
    }

    public async generateName(domain: QuestNameDomain, maxWords: number): Promise<GeneratedName> {
        await this.initialize();
        const locationName = await this.tryMapVillageName(domain, maxWords);
        if (locationName) {
            return locationName;
        }
        const target = this.targetSelector.pickWordTarget(domain, maxWords);
        return this.generateFromSources(domain, target);
    }

    private async tryMapVillageName(domain: QuestNameDomain, maxWords: number): Promise<GeneratedName | null> {
        if (domain !== 'location') {
            return null;
        }
        const villageSource = this.sources.find((source) => source.domain === 'location' && source.type === 'map-village' && source.available);
        if (!villageSource) {
            return null;
        }
        const villageName = (await villageSource.generate(maxWords))[0];
        if (!villageName) {
            return null;
        }
        return { text: this.titleCase([villageName]), domain, sourceTypes: [villageSource.type] };
    }

    private async generateFromSources(domain: QuestNameDomain, target: number): Promise<GeneratedName> {
        const words: string[] = [];
        const sourceTypes: PackSourceType[] = [];
        while (words.length < target) {
            const source = this.pickSource(domain);
            const limit = Math.min(3, target - words.length);
            words.push(...(await source.generate(limit)).slice(0, limit));
            sourceTypes.push(source.type);
        }
        return { text: this.titleCase(words), domain, sourceTypes };
    }

    private async runInitialization(): Promise<void> {
        try {
            await this.loadAssets();
            this.createSources();
            await this.probeSources();
            this.initialized = true;
        } finally {
            this.initializationPromise = null;
        }
    }

    private async loadAssets(): Promise<void> {
        for (const [key, path] of Object.entries(ASSET_PATHS)) {
            const words = this.wordList(await this.fileReader(path));
            if (words.length === 0) {
                throw new Error(`Quest pack asset "${key}" at "${path}" did not contain any usable words.`);
            }
            this.assets[key] = words;
        }
    }

    private createSources(): void {
        this.sources.length = 0;
        const sourceFactory = new QuestPackSourceFactory({
            fetchImpl: this.fetchImpl,
            random: this.random,
            assets: this.assets,
            locationNamesProvider: this.locationNamesProvider,
        });
        for (const domain of DOMAINS) {
            this.sources.push(sourceFactory.createLocalSource(domain));
            this.sources.push(sourceFactory.createEchoSource(domain));
        }
        this.sources.push(sourceFactory.createMapVillageSource());
        this.sources.push(sourceFactory.createLocationSource());
        this.sources.push(sourceFactory.createNameSource('character'));
        this.sources.push(sourceFactory.createNameSource('monster'));
    }

    private async probeSources(): Promise<void> {
        for (const source of this.sources) {
            if (source.type === 'map-village') {
                source.available = (await this.locationNamesProvider()).map((name) => name.trim()).filter(Boolean).length > 0;
                continue;
            }
            source.available = !source.type.startsWith('remote') || await this.isAvailable(source);
        }
    }

    private async isAvailable(source: PackSource): Promise<boolean> {
        try {
            return (await source.generate(1)).length > 0;
        } catch {
            return false;
        }
    }

    private pickSource = (domain: QuestNameDomain): PackSource => {
        const availableSources = this.sources.filter((source) => source.domain === domain && source.available);
        if (availableSources.length > 0) {
            return this.random.pick(availableSources);
        }
        const localFallback = this.sources.find((source) => source.domain === domain && source.type === 'local-pattern');
        if (!localFallback) {
            throw new Error(`No available quest pack sources for domain "${domain}".`);
        }
        return localFallback;
    };

    private titleCase = (words: string[]): string => words.map((word) => this.capitalizeWord(word)).join(' ');

    private capitalizeWord = (word: string): string => word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');

    private wordList = (text: string): string[] => text
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => /^[a-z][a-z'-]*$/i.test(word));

    private async readTextAsset(path: string): Promise<string> {
        const url = new URL(path, import.meta.url);
        if (url.protocol === 'file:') {
            const load = Function('path', 'return import(path)') as (path: string) => Promise<{ readFile(file: URL, encoding: string): Promise<string> }>;
            return (await load('node:fs/promises')).readFile(url, 'utf8');
        }
        return (await this.fetchImpl(url.toString())).text();
    }
}
