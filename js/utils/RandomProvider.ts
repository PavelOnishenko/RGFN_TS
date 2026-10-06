export type RandomProviderMode = 'true' | 'pseudo';

export type RandomProviderSettings = {
    mode: RandomProviderMode;
    pseudoSeed: string;
    activeSeed: string;
};

const STORAGE_KEY = 'rgfn_random_provider_settings_v1';
const DEFAULT_PSEUDO_SEED = 'rgfn-default-seed';
const ORIGINAL_MATH_RANDOM = Math.random.bind(Math);

function normalizePseudoSeed(seed: string): string {
    const normalized = (seed ?? '').trim();
    return normalized.length > 0 ? normalized : DEFAULT_PSEUDO_SEED;
}

function readStoredSettings(): { mode: RandomProviderMode; pseudoSeed: string } | null {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<{ mode: RandomProviderMode; pseudoSeed: string }>;
        const mode = parsed.mode === 'pseudo' ? 'pseudo' : 'true';
        return { mode, pseudoSeed: normalizePseudoSeed(parsed.pseudoSeed ?? DEFAULT_PSEUDO_SEED) };
    } catch {
        return null;
    }
}

function persistSettings(mode: RandomProviderMode, pseudoSeed: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, pseudoSeed: normalizePseudoSeed(pseudoSeed) }));
}

function createRandomizedSeed(): string {
    const cryptoObject = globalThis.crypto;
    if (cryptoObject?.getRandomValues) {
        const values = cryptoObject.getRandomValues(new Uint32Array(2));
        return `${values[0].toString(16)}-${values[1].toString(16)}`;
    }

    const fallback = Math.floor(ORIGINAL_MATH_RANDOM() * Number.MAX_SAFE_INTEGER);
    return `fallback-${fallback.toString(16)}`;
}

function xmur3(value: string): () => number {
    let hash = 1779033703 ^ value.length;

    for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
        hash = (hash << 13) | (hash >>> 19);
    }

    return () => {
        hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
        hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
        hash ^= hash >>> 16;
        return hash >>> 0;
    };
}

function mulberry32(seed: number): () => number {
    let current = seed >>> 0;

    return () => {
        current = (current + 0x6D2B79F5) >>> 0;
        let value = Math.imul(current ^ (current >>> 15), current | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

class RandomProvider {
    private mode: RandomProviderMode = 'true';
    private pseudoSeed = DEFAULT_PSEUDO_SEED;
    private activeSeed = '';
    private generator: () => number = () => ORIGINAL_MATH_RANDOM();
    private installed = false;

    public initialize(): void {
        const stored = readStoredSettings();
        this.mode = stored?.mode ?? 'true';
        this.pseudoSeed = stored?.pseudoSeed ?? DEFAULT_PSEUDO_SEED;
        this.reseed();
        this.installMathRandom();
    }

    public configure(mode: RandomProviderMode, pseudoSeed: string): RandomProviderSettings {
        this.mode = mode;
        this.pseudoSeed = normalizePseudoSeed(pseudoSeed);
        persistSettings(this.mode, this.pseudoSeed);
        this.reseed();
        this.installMathRandom();
        return this.getSettings();
    }

    public readonly getSettings = (): RandomProviderSettings => ({ mode: this.mode, pseudoSeed: this.pseudoSeed, activeSeed: this.activeSeed });

    public readonly nextFloat = (): number => this.generator();

    public nextInt(min: number, max: number): number {
        const lower = Math.ceil(Math.min(min, max));
        const upper = Math.floor(Math.max(min, max));
        return Math.floor(this.nextFloat() * ((upper - lower) + 1)) + lower;
    }

    private reseed(): void {
        this.activeSeed = this.mode === 'pseudo' ? this.pseudoSeed : createRandomizedSeed();
        const seedFactory = xmur3(`${this.mode}:${this.activeSeed}`);
        this.generator = mulberry32(seedFactory());
    }

    private installMathRandom(): void {
        if (this.installed && Math.random === this.boundRandom) {
            return;
        }

        Math.random = this.boundRandom;
        this.installed = true;
    }

    private readonly boundRandom = (): number => this.nextFloat();
}

const randomProvider = new RandomProvider();

export function initializeGameRandomProvider(): RandomProviderSettings {
    randomProvider.initialize();
    return randomProvider.getSettings();
}

export const configureGameRandomProvider = (mode: RandomProviderMode, pseudoSeed: string): RandomProviderSettings => randomProvider.configure(mode, pseudoSeed);

export const getGameRandomProviderSettings = (): RandomProviderSettings => randomProvider.getSettings();

export const getNormalizedPseudoRandomSeed = (seed: string): string => normalizePseudoSeed(seed);
