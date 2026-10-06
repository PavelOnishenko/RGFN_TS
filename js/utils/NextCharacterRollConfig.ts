const PLAYER_STATS = ['vitality', 'toughness', 'strength', 'agility', 'connection', 'intelligence'] as const;

export type PlayerStat = typeof PLAYER_STATS[number];
export type NextCharacterRollAllocation = Record<PlayerStat, number>;

export const NEXT_CHARACTER_ROLL_STORAGE_KEY = 'rgfn_next_character_roll_v1';

export const getPlayerStats = (): PlayerStat[] => [...PLAYER_STATS];

export const createEmptyNextCharacterRollAllocation = (): NextCharacterRollAllocation => ({
    vitality: 0,
    toughness: 0,
    strength: 0,
    agility: 0,
    connection: 0,
    intelligence: 0,
});

export function normalizeNextCharacterRollAllocation(value: Partial<Record<PlayerStat, unknown>> | null | undefined): NextCharacterRollAllocation {
    const normalized = createEmptyNextCharacterRollAllocation();

    PLAYER_STATS.forEach((stat) => {
        const rawValue = value?.[stat];
        const parsed = typeof rawValue === 'number' ? rawValue : Number.parseInt(String(rawValue ?? 0), 10);
        normalized[stat] = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    });

    return normalized;
}

export const getNextCharacterRollAllocationTotal = (allocation: NextCharacterRollAllocation): number => PLAYER_STATS.reduce((total, stat) => total + allocation[stat], 0);

export function summarizeNextCharacterRollAllocation(allocation: NextCharacterRollAllocation): string {
    const parts = PLAYER_STATS
        .filter((stat) => allocation[stat] > 0)
        .map((stat) => `${stat.slice(0, 3).toUpperCase()} +${allocation[stat]}`);

    return parts.length > 0 ? parts.join(', ') : 'Random roll';
}

function getLocalStorage(): Storage | null {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }

    return window.localStorage;
}

export function loadNextCharacterRollAllocation(): NextCharacterRollAllocation | null {
    const storage = getLocalStorage();
    if (!storage) {
        return null;
    }

    const raw = storage.getItem(NEXT_CHARACTER_ROLL_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return normalizeNextCharacterRollAllocation(JSON.parse(raw) as Partial<Record<PlayerStat, unknown>>);
    } catch {
        storage.removeItem(NEXT_CHARACTER_ROLL_STORAGE_KEY);
        return null;
    }
}

export function saveNextCharacterRollAllocation(allocation: NextCharacterRollAllocation): void {
    const storage = getLocalStorage();
    if (!storage) {
        return;
    }

    storage.setItem(NEXT_CHARACTER_ROLL_STORAGE_KEY, JSON.stringify(normalizeNextCharacterRollAllocation(allocation)));
}

export function clearNextCharacterRollAllocation(): void {
    const storage = getLocalStorage();
    storage?.removeItem(NEXT_CHARACTER_ROLL_STORAGE_KEY);
}

export function consumeNextCharacterRollAllocation(expectedTotalPoints: number): NextCharacterRollAllocation | null {
    const storage = getLocalStorage();
    if (!storage) {
        return null;
    }

    const allocation = loadNextCharacterRollAllocation();
    if (!allocation) {
        return null;
    }

    if (getNextCharacterRollAllocationTotal(allocation) !== Math.max(0, expectedTotalPoints)) {
        storage.removeItem(NEXT_CHARACTER_ROLL_STORAGE_KEY);
        return null;
    }

    storage.removeItem(NEXT_CHARACTER_ROLL_STORAGE_KEY);
    return allocation;
}
