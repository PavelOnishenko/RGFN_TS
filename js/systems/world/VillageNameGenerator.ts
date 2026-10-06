type NameWordToken = 'ECHO' | 'ADJECTIVE' | 'PLACE';

type NamePattern = {
    tokens: NameWordToken[];
    weight: number;
};

const NAME_PATTERNS: NamePattern[] = [
    { tokens: ['ECHO'], weight: 39 },
    { tokens: ['ADJECTIVE', 'PLACE'], weight: 34 },
    { tokens: ['ECHO', 'PLACE'], weight: 14 },
    { tokens: ['PLACE', 'PLACE'], weight: 6 },
    { tokens: ['ADJECTIVE', 'ECHO'], weight: 5 },
    { tokens: ['ADJECTIVE', 'PLACE', 'PLACE'], weight: 2 },
];

// Uses the same phonetic direction introduced by quest name generation packs
// (short pseudo-words stitched from stable syllables) instead of the legacy
// oak/moss/stead-style compounds.
const ECHO_SYLLABLES = [
    'va', 'lor', 'quin', 'esh', 'dra', 'morn', 'lys', 'tor', 'zen', 'ka',
    'thal', 'vor', 'ira', 'sel', 'nor', 'vel', 'ryn', 'hal', 'cor', 'myr',
] as const;

const ADJECTIVES = [
    'Ancient', 'Bleak', 'Bright', 'Calm', 'Crimson', 'Distant', 'Feral',
    'Golden', 'Hollow', 'Luminous', 'Misty', 'Quiet', 'Sacred', 'Scarlet',
    'Silent', 'Silver', 'Stormy', 'Sunlit', 'Verdant', 'Windblown',
] as const;

const PLACE_WORDS = [
    'Abbey', 'Archive', 'Beacon', 'Bridge', 'Camp', 'Citadel', 'Cove',
    'Crossing', 'Dale', 'Field', 'Ford', 'Garden', 'Gate', 'Grove',
    'Harbor', 'Heights', 'Hollow', 'Keep', 'Marsh', 'Meadow', 'Pass',
    'Reach', 'Rest', 'Ridge', 'Sanctuary', 'Shore', 'Spire', 'Summit',
    'Temple', 'Threshold', 'Tower', 'Vale', 'Vault', 'Watch', 'Well',
] as const;

function seededRandom(seed: number): number {
    const value = Math.sin(seed) * 10000;
    return value - Math.floor(value);
}

function pickFrom<T>(items: readonly T[], seed: number): T {
    const index = Math.floor(seededRandom(seed) * items.length) % items.length;
    return items[index];
}

function pickWeightedPattern(seed: number): NamePattern {
    const totalWeight = NAME_PATTERNS.reduce((total, pattern) => total + pattern.weight, 0);
    let roll = Math.floor(seededRandom(seed) * totalWeight) + 1;
    for (const pattern of NAME_PATTERNS) {
        roll -= pattern.weight;
        if (roll <= 0) {
            return pattern;
        }
    }
    return NAME_PATTERNS[0];
}

const capitalizePart = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

function buildEchoWord(seed: number): string {
    const complexityRoll = seededRandom(seed + 37);
    const partCount = complexityRoll < 0.84
        ? 2
        : complexityRoll < 0.97
            ? 3
            : 4;

    const parts = Array.from({ length: partCount }, (_, index) => (
        pickFrom(ECHO_SYLLABLES, seed + 211 + (index * 67))
    ));

    return capitalizePart(parts.join(''));
}

function buildWord(token: NameWordToken, seed: number): string {
    if (token === 'ADJECTIVE') {
        return pickFrom(ADJECTIVES, seed + 701);
    }

    if (token === 'PLACE') {
        return pickFrom(PLACE_WORDS, seed + 809);
    }

    return buildEchoWord(seed + 907);
}

export function generateVillageName(seed: number): string {
    const pattern = pickWeightedPattern(seed + 11);
    return pattern.tokens
        .map((token, index) => buildWord(token, seed + (index * 131)))
        .join(' ');
}
