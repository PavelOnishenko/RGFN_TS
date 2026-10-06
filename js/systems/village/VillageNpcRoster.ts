/* eslint-disable style-guide/function-length-error, style-guide/arrow-function-style */
import { NpcDisposition, VillageNpcProfile } from './VillageDialogueEngine.js';

export type VillageNpcLifeStatus = 'alive' | 'dead';

export type VillageNpcPassport = {
    id: string;
    key: string;
    name: string;
    villageName: string;
    occupation: string;
    personality: NpcDisposition;
    speechStyle: string;
    look: string;
    tileCol: number | null;
    tileRow: number | null;
    settlementKnowledgeRadiusCells?: number;
};

export type VillageNpcRosterEntry = {
    passport: VillageNpcPassport;
    lifeStatus: VillageNpcLifeStatus;
    firstSeenAtTick: number;
    lastUpdatedAtTick: number;
    sourceTag: string;
};

export class VillageRosterIntegrityError extends Error {
    public readonly shortMessage: string;
    public readonly fullMessage: string;

    public constructor(shortMessage: string, fullMessage: string) {
        super(fullMessage);
        this.name = 'VillageRosterIntegrityError';
        this.shortMessage = shortMessage;
        this.fullMessage = fullMessage;
    }
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

export default class VillageNpcRoster {
    private entriesByKey: Map<string, VillageNpcRosterEntry> = new Map();
    private tickCounter = 0;

    public constructor(private readonly onEntryChanged?: (entry: VillageNpcRosterEntry) => void) {}

    public clear(): void {
        this.entriesByKey.clear();
        this.tickCounter = 0;
    }

    public hasVillage(villageName: string): boolean {
        const villageKey = normalize(villageName);
        if (!villageKey) {
            return false;
        }
        for (const entry of this.entriesByKey.values()) {
            if (normalize(entry.passport.villageName) === villageKey) {
                return true;
            }
        }
        return false;
    }

    public upsert(villageName: string, npc: VillageNpcProfile, sourceTag: string, villageTile?: { col: number; row: number }): VillageNpcRosterEntry {
        const key = this.getKey(villageName, npc.name);
        const nowTick = this.nextTick();
        const existing = this.entriesByKey.get(key);
        const normalizedVillage = villageName.trim();
        if (existing) {
            existing.passport = {
                ...existing.passport,
                name: npc.name,
                villageName: normalizedVillage,
                occupation: npc.role,
                personality: npc.disposition,
                speechStyle: npc.speechStyle,
                look: npc.look,
                tileCol: villageTile?.col ?? existing.passport.tileCol,
                tileRow: villageTile?.row ?? existing.passport.tileRow,
                settlementKnowledgeRadiusCells: npc.settlementKnowledgeRadiusCells ?? existing.passport.settlementKnowledgeRadiusCells,
            };
            existing.lastUpdatedAtTick = nowTick;
            existing.sourceTag = sourceTag;
            this.entriesByKey.set(key, existing);
            this.notifyChanged(existing);
            return existing;
        }

        const created: VillageNpcRosterEntry = {
            passport: {
                id: npc.id,
                key,
                name: npc.name,
                villageName: normalizedVillage,
                occupation: npc.role,
                personality: npc.disposition,
                speechStyle: npc.speechStyle,
                look: npc.look,
                tileCol: villageTile?.col ?? null,
                tileRow: villageTile?.row ?? null,
                settlementKnowledgeRadiusCells: npc.settlementKnowledgeRadiusCells,
            },
            lifeStatus: 'alive',
            firstSeenAtTick: nowTick,
            lastUpdatedAtTick: nowTick,
            sourceTag,
        };
        this.entriesByKey.set(key, created);
        this.notifyChanged(created);
        return created;
    }

    public markDead(villageName: string, npcName: string): void {
        const key = this.getKey(villageName, npcName);
        const entry = this.entriesByKey.get(key);
        if (!entry) {
            return;
        }
        entry.lifeStatus = 'dead';
        entry.lastUpdatedAtTick = this.nextTick();
        this.notifyChanged(entry);
    }

    public getVillageProfiles(villageName: string): VillageNpcProfile[] {
        const villageKey = normalize(villageName);
        const entries = Array.from(this.entriesByKey.values())
            .filter((entry) => normalize(entry.passport.villageName) === villageKey)
            .sort((left, right) => left.passport.name.localeCompare(right.passport.name));

        return entries.map((entry) => this.toProfile(entry));
    }

    public getAllEntries(villageFilter: string = ''): VillageNpcRosterEntry[] {
        const normalizedFilter = normalize(villageFilter);
        return Array.from(this.entriesByKey.values())
            .filter((entry) => !normalizedFilter || normalize(entry.passport.villageName) === normalizedFilter)
            .sort((left, right) => {
                const villageCompare = left.passport.villageName.localeCompare(right.passport.villageName);
                if (villageCompare !== 0) {
                    return villageCompare;
                }
                return left.passport.name.localeCompare(right.passport.name);
            })
            .map((entry) => ({ ...entry, passport: { ...entry.passport } }));
    }

    public getVillageNames(): string[] {
        return Array.from(new Set(Array.from(this.entriesByKey.values()).map((entry) => entry.passport.villageName)))
            .sort((left, right) => left.localeCompare(right));
    }

    public assertNpcExistsInVillage(villageName: string, npcName: string, context: string): void {
        const key = this.getKey(villageName, npcName);
        const entry = this.entriesByKey.get(key);
        if (entry) {
            return;
        }
        const shortMessage = `Roster integrity violation: ${npcName} is missing in ${villageName}.`;
        const fullMessage = `${shortMessage}\nContext: ${context}\nRoster key searched: ${key}\nKnown villages: ${this.getVillageNames().join(', ') || '(none)'}`;
        throw new VillageRosterIntegrityError(shortMessage, fullMessage);
    }

    private toProfile(entry: VillageNpcRosterEntry): VillageNpcProfile {
        const lifeSuffix = entry.lifeStatus === 'dead' ? ' [DEAD]' : '';
        return {
            id: entry.passport.id,
            name: entry.passport.name,
            role: `${entry.passport.occupation}${lifeSuffix}`,
            look: entry.passport.look,
            speechStyle: entry.passport.speechStyle,
            disposition: entry.passport.personality,
            settlementKnowledgeRadiusCells: entry.passport.settlementKnowledgeRadiusCells,
        };
    }

    private getKey(villageName: string, npcName: string): string {
        return `${normalize(villageName)}::${normalize(npcName)}`;
    }

    private nextTick(): number {
        this.tickCounter += 1;
        return this.tickCounter;
    }

    private notifyChanged(entry: VillageNpcRosterEntry): void {
        this.onEntryChanged?.({ ...entry, passport: { ...entry.passport } });
    }
}
