import { createItemById } from '../../Item.js';
import { ItemData } from '../../ItemDeclarations.js';
import PlayerInventoryAndRender from './PlayerInventoryAndRender.js';

type LegacyInventoryState = {
    itemIds: string[];
    equippedWeaponId: string | null;
    equippedArmorId: string | null;
    equippedOffhandWeaponId: string | null;
};

export default class PlayerPersistence extends PlayerInventoryAndRender {
    public getState = (): Record<string, unknown> => ({ ...this.getCoreState(), ...this.inventorySystem.getState() });

    public restoreState(state: Record<string, unknown>): void {
        this.restorePlayerStats(state);
        this.restoreCombatState(state);
        this.restoreInventoryState(state);
        this.updateStats();
        this.hp = Math.max(0, Math.min(this.maxHp, this.toNumber(state.hp, this.hp)));
        this.mana = Math.max(0, Math.min(this.maxMana, this.toNumber(state.mana, this.mana)));
    }

    private restorePlayerStats(state: Record<string, unknown>): void {
        this.level = this.toNumber(state.level, this.level);
        this.name = typeof state.name === 'string' && state.name.trim().length > 0 ? state.name : this.name;
        this.xp = this.toNumber(state.xp, this.xp);
        this.xpToNextLevel = this.toNumber(state.xpToNextLevel, this.xpToNextLevel);
        this.vitality = this.toNumber(state.vitality, this.vitality);
        this.toughness = this.toNumber(state.toughness, this.toughness);
        this.strength = this.toNumber(state.strength, this.strength);
        this.agility = this.toNumber(state.agility, this.agility);
        this.connection = this.toNumber(state.connection, this.connection);
        this.intelligence = this.toNumber(state.intelligence, this.intelligence);
        this.skillPoints = this.toNumber(state.skillPoints, this.skillPoints);
        this.magicPoints = this.toNumber(state.magicPoints, this.magicPoints);
        this.gold = this.toNumber(state.gold, this.gold);
        this.fatigue = Math.max(0, Math.min(this.getMaxFatigue(), this.toNumber(state.fatigue, this.fatigue)));
        this.armorAbsorbedHp = this.toNumber(state.armorAbsorbedHp, 0);
    }

    private restoreCombatState(state: Record<string, unknown>): void {
        this.setCombatState({
            rageTurns: this.toNumber(state.rageTurns, 0),
            rageMultiplier: this.toNumber(state.rageMultiplier, 1),
            blockAdvantage: Boolean(state.blockAdvantage),
            successfulDodgeMultiplier: typeof state.successfulDodgeMultiplier === 'number' ? state.successfulDodgeMultiplier : null,
        });
    }

    private restoreInventoryState(state: Record<string, unknown>): void {
        const legacyState = this.readLegacyInventoryState(state);
        const inventorySnapshots = this.readInventorySnapshots(state.inventoryItems);
        const restoredFromSnapshots = this.inventorySystem.restoreStateFromSnapshots(
            inventorySnapshots,
            this.toItemData(state.equippedWeapon),
            this.toItemData(state.equippedOffhandWeapon),
            this.toItemData(state.equippedArmor),
        );
        if (!restoredFromSnapshots) {
            const legacyRestoreState = { ...legacyState, itemFactory: createItemById };
            this.inventorySystem.restoreState(legacyRestoreState);
        }
    }

    private getCoreState = (): Record<string, unknown> => ({ ...this.getPrimaryState(), ...this.getCombatSnapshot() });

    private getPrimaryState = (): Record<string, unknown> => ({ ...this.getIdentityState(), ...this.getVitalsState() });

    private getIdentityState = (): Record<string, unknown> => ({
        level: this.level,
        name: this.name,
        xp: this.xp,
        xpToNextLevel: this.xpToNextLevel,
        vitality: this.vitality,
        toughness: this.toughness,
        strength: this.strength,
        agility: this.agility,
        connection: this.connection,
        intelligence: this.intelligence,
        skillPoints: this.skillPoints,
        magicPoints: this.magicPoints,
    });

    private getVitalsState = (): Record<string, unknown> => ({
        hp: this.hp,
        mana: this.mana,
        gold: this.gold,
        fatigue: this.fatigue,
        armorAbsorbedHp: this.armorAbsorbedHp,
    });

    private getCombatSnapshot(): Record<string, unknown> {
        const combat = this.getCombatState();
        return {
            rageTurns: combat.rageTurns,
            rageMultiplier: combat.rageMultiplier,
            blockAdvantage: combat.blockAdvantage,
            successfulDodgeMultiplier: combat.successfulDodgeMultiplier,
        };
    }

    private readLegacyInventoryState(state: Record<string, unknown>): LegacyInventoryState {
        const itemIds = Array.isArray(state.inventoryItemIds) ? state.inventoryItemIds.filter((id): id is string => typeof id === 'string') : [];
        const equippedWeaponId = typeof state.equippedWeaponId === 'string' ? state.equippedWeaponId : null;
        const equippedOffhandWeaponId = typeof state.equippedOffhandWeaponId === 'string' ? state.equippedOffhandWeaponId : null;
        const equippedArmorId = typeof state.equippedArmorId === 'string' ? state.equippedArmorId : null;
        return { itemIds, equippedWeaponId, equippedArmorId, equippedOffhandWeaponId };
    }

    private readInventorySnapshots(value: unknown): ItemData[] | undefined {
        if (!Array.isArray(value)) {
            return undefined;
        }
        return value.map((item) => this.toItemData(item)).filter((item): item is ItemData => item !== null);
    }

    private toNumber = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

    private toItemData(value: unknown): ItemData | null {
        if (!value || typeof value !== 'object') {
            return null;
        }
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.description !== 'string' || typeof candidate.type !== 'string') {
            return null;
        }
        return candidate as unknown as ItemData;
    }
}
