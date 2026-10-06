/* eslint-disable style-guide/file-length-warning */
import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Player from '../../entities/player/Player.js';
import MagicSystem from '../../systems/controllers/magic/MagicSystem.js';
import { QuestNode } from '../../systems/quest/QuestTypes.js';

const CURRENT_SAVE_VERSION = 3;

export type GameSaveState = {
    version: typeof CURRENT_SAVE_VERSION;
    worldMap: Record<string, unknown>;
    player: Record<string, unknown>;
    spellLevels: Record<string, number>;
    quest: QuestNode | null;
    sideQuests?: QuestNode[];
    time?: Record<string, unknown>;
    worldSimulation: Record<string, unknown>;
};

export type GameStartupState =
    | { mode: 'new' }
    | { mode: 'restore'; save: GameSaveState };

export default class GamePersistenceRuntime {
    private lastSavedSnapshot = '';
    private lastSnapshotHash = '';
    private lastSavedAtIso: string | null = null;
    private lastLoadedAtIso: string | null = null;
    private lastLoadedSaveVersion: number | null = null;

    public constructor(private readonly saveKey: string, private readonly legacySaveKeys: string[] = []) {}

    public clearAllGameSaves(): void {
        this.getKnownSaveKeys().forEach((key) => window.localStorage.removeItem(key));
        this.lastSavedSnapshot = '';
        this.lastSnapshotHash = '';
        this.lastSavedAtIso = null;
        this.lastLoadedAtIso = null;
        this.lastLoadedSaveVersion = null;
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public saveGameIfChanged(
        worldMap: WorldMap,
        player: Player,
        magicSystem: MagicSystem,
        activeQuest: QuestNode | null,
        activeSideQuests: QuestNode[] = [],
        timeState?: Record<string, unknown>,
        worldSimulationState?: Record<string, unknown>,
    ): void {
        const snapshot = JSON.stringify({
            version: CURRENT_SAVE_VERSION,
            worldMap: worldMap.getState(),
            player: player.getState(),
            spellLevels: magicSystem.getSpellLevels(),
            quest: activeQuest,
            sideQuests: activeSideQuests,
            time: timeState,
            worldSimulation: this.sanitizeWorldSimulationState(worldSimulationState),
        } as GameSaveState);
        if (snapshot === this.lastSavedSnapshot) {
            return;
        }
        this.lastSavedSnapshot = snapshot;
        this.lastSnapshotHash = this.createSnapshotHash(snapshot);
        this.lastSavedAtIso = new Date().toISOString();
        window.localStorage.setItem(this.saveKey, snapshot);
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public loadValidatedSaveSnapshot(): GameSaveState | null {
        for (const sourceKey of this.getKnownSaveKeys()) {
            const raw = window.localStorage.getItem(sourceKey);
            if (!raw) {
                continue;
            }
            const parsed = this.parseRawSave(raw);
            const migrated = parsed ? this.migrateToCurrentVersion(parsed) : null;
            if (!migrated || !this.isValidSaveState(migrated)) {
                console.warn(`Discarding invalid save data from ${sourceKey}; starting a new character.`);
                window.localStorage.removeItem(sourceKey);
                continue;
            }
            const serialized = JSON.stringify(migrated);
            this.lastSnapshotHash = this.createSnapshotHash(serialized);
            this.lastLoadedSaveVersion = typeof parsed?.version === 'number' ? parsed.version : null;
            this.lastLoadedAtIso = new Date().toISOString();
            if (sourceKey !== this.saveKey || parsed?.version !== CURRENT_SAVE_VERSION) {
                window.localStorage.setItem(this.saveKey, serialized);
            }
            if (sourceKey !== this.saveKey) {
                window.localStorage.removeItem(sourceKey);
            }
            return migrated;
        }
        return null;
    }

    public readonly getOverview = (): {
        key: string;
        version: number;
        loadedVersion: number | null;
        snapshotHash: string | null;
        lastSavedAt: string | null;
        lastLoadedAt: string | null;
    } => ({
        key: this.saveKey,
        version: CURRENT_SAVE_VERSION,
        loadedVersion: this.lastLoadedSaveVersion,
        snapshotHash: this.lastSnapshotHash || null,
        lastSavedAt: this.lastSavedAtIso,
        lastLoadedAt: this.lastLoadedAtIso,
    });

    private getKnownSaveKeys = (): string[] => Array.from(new Set([this.saveKey, ...this.legacySaveKeys]));

    private parseRawSave(raw: string): Partial<GameSaveState> | null {
        try {
            return JSON.parse(raw) as Partial<GameSaveState>;
        } catch {
            return null;
        }
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private migrateToCurrentVersion(parsed: Partial<GameSaveState>): GameSaveState | null {
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        if (!Number.isInteger(parsed.version) || Number(parsed.version) < 1 || Number(parsed.version) > CURRENT_SAVE_VERSION) {
            return null;
        }
        const worldMap = this.asRecord(parsed.worldMap);
        const player = this.asRecord(parsed.player);
        const spellLevels = this.asSpellLevelRecord(parsed.spellLevels);
        if (!worldMap || !player || !spellLevels) {
            return null;
        }
        const legacyWorldSimulation = this.extractLegacyWorldSimulation(parsed);
        const worldSimulation = this.sanitizeWorldSimulationState({ ...legacyWorldSimulation, ...this.asRecord(parsed.worldSimulation) });
        return {
            version: CURRENT_SAVE_VERSION,
            worldMap,
            player,
            spellLevels,
            quest: parsed.quest ?? null,
            sideQuests: Array.isArray(parsed.sideQuests) ? parsed.sideQuests : [],
            time: this.asRecord(parsed.time),
            worldSimulation,
        };
    }

    private readonly isValidSaveState = (save: GameSaveState): boolean => this.isValidWorldMapState(save.worldMap)
            && this.isValidPlayerState(save.player)
            && this.isValidSpellLevels(save.spellLevels)
            && (save.quest === null || Boolean(this.asRecord(save.quest)))
            && Array.isArray(save.sideQuests)
            && (save.time === undefined || Boolean(this.asRecord(save.time)))
            && Boolean(this.asRecord(save.worldSimulation));

    private isValidWorldMapState(state: Record<string, unknown>): boolean {
        const playerGridPos = this.asRecord(state.playerGridPos);
        return this.isFiniteNumber(state.worldSeed)
            && this.isFiniteNumber(playerGridPos?.col)
            && this.isFiniteNumber(playerGridPos?.row)
            && Array.isArray(state.fogStates)
            && Array.isArray(state.villages);
    }

    private isValidPlayerState(state: Record<string, unknown>): boolean {
        if (typeof state.name !== 'string' || state.name.trim().length === 0) {
            return false;
        }
        const requiredNumbers = [
            'level', 'xp', 'xpToNextLevel', 'vitality', 'toughness', 'strength', 'agility',
            'connection', 'intelligence', 'skillPoints', 'magicPoints', 'hp', 'mana', 'gold',
        ];
        return requiredNumbers.every((key) => this.isFiniteNumber(state[key]));
    }

    private readonly isValidSpellLevels = (spellLevels: Record<string, number>): boolean =>
        Object.values(spellLevels).every((level) => this.isFiniteNumber(level));

    private readonly isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

    private extractLegacyWorldSimulation(parsed: Partial<GameSaveState>): Record<string, unknown> {
        const parsedAsRecord = parsed as Record<string, unknown>;
        return {
            npcs: this.asArray(parsedAsRecord.npcs),
            monsters: this.asArray(parsedAsRecord.monsters),
            conflicts: this.asArray(parsedAsRecord.conflicts),
            factionControl: this.asRecord(parsedAsRecord.factionControl) ?? {},
        };
    }

    private sanitizeWorldSimulationState(worldSimulationState?: Record<string, unknown>): Record<string, unknown> {
        if (!worldSimulationState || typeof worldSimulationState !== 'object') {
            return {};
        }
        return { ...worldSimulationState };
    }

    private asRecord(value: unknown): Record<string, unknown> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        return value as Record<string, unknown>;
    }

    private readonly asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

    private asSpellLevelRecord(value: unknown): Record<string, number> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        if (!Object.values(value as Record<string, unknown>).every((level) => this.isFiniteNumber(level))) {
            return null;
        }
        return Object.entries(value as Record<string, unknown>).reduce((acc, [key, level]) => {
            if (typeof level === 'number' && Number.isFinite(level)) {
                acc[key] = level;
            }
            return acc;
        }, {} as Record<string, number>);
    }

    private createSnapshotHash(snapshot: string): string {
        let hash = 5381;
        for (let index = 0; index < snapshot.length; index += 1) {
            hash = ((hash << 5) + hash) + snapshot.charCodeAt(index);
            hash |= 0;
        }
        return `djb2:${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }
}
