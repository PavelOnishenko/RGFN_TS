import { RandomEncounterType } from '../systems/encounter/EncounterSystem.js';

const STORAGE_KEY = 'rgfn_developer_mode_v1';

export type DeveloperModeConfig = {
    enabled: boolean;
    everythingDiscovered: boolean;
    fogOfWar: boolean;
    questIntroEnabled: boolean;
    encounterTypes: Record<RandomEncounterType, boolean>;
    autoGodBoostOnCharacterCreation: boolean;
};

const DEFAULT_CONFIG: DeveloperModeConfig = {
    enabled: false,
    everythingDiscovered: false,
    fogOfWar: true,
    questIntroEnabled: true,
    encounterTypes: { monster: true, item: true, traveler: true },
    autoGodBoostOnCharacterCreation: false,
};

const DEV_ENABLED_CONFIG: DeveloperModeConfig = {
    enabled: true,
    everythingDiscovered: true,
    fogOfWar: true,
    questIntroEnabled: false,
    encounterTypes: { monster: false, item: false, traveler: false },
    autoGodBoostOnCharacterCreation: true,
};

const getLocalStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

const parse = (raw: string | null): DeveloperModeConfig | null => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<DeveloperModeConfig>;
        const encounterTypes = (parsed.encounterTypes ?? {}) as Partial<Record<RandomEncounterType, boolean>>;
        return {
            enabled: Boolean(parsed.enabled),
            everythingDiscovered: typeof parsed.everythingDiscovered === 'boolean' ? parsed.everythingDiscovered : DEFAULT_CONFIG.everythingDiscovered,
            fogOfWar: typeof parsed.fogOfWar === 'boolean' ? parsed.fogOfWar : DEFAULT_CONFIG.fogOfWar,
            questIntroEnabled: typeof parsed.questIntroEnabled === 'boolean' ? parsed.questIntroEnabled : DEFAULT_CONFIG.questIntroEnabled,
            autoGodBoostOnCharacterCreation: typeof parsed.autoGodBoostOnCharacterCreation === 'boolean'
                ? parsed.autoGodBoostOnCharacterCreation
                : DEFAULT_CONFIG.autoGodBoostOnCharacterCreation,
            encounterTypes: {
                monster: typeof encounterTypes.monster === 'boolean' ? encounterTypes.monster : DEFAULT_CONFIG.encounterTypes.monster,
                item: typeof encounterTypes.item === 'boolean' ? encounterTypes.item : DEFAULT_CONFIG.encounterTypes.item,
                traveler: typeof encounterTypes.traveler === 'boolean' ? encounterTypes.traveler : DEFAULT_CONFIG.encounterTypes.traveler,
            },
        };
    } catch {
        return null;
    }
};

export const getDeveloperModeConfig = (): DeveloperModeConfig => {
    const storage = getLocalStorage();
    const saved = parse(storage?.getItem(STORAGE_KEY) ?? null);
    return saved ?? DEFAULT_CONFIG;
};

export const isDeveloperModeEnabled = (): boolean => getDeveloperModeConfig().enabled;

export const setDeveloperModeEnabled = (enabled: boolean): DeveloperModeConfig => {
    const config = enabled ? DEV_ENABLED_CONFIG : DEFAULT_CONFIG;
    const storage = getLocalStorage();
    storage?.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
};
