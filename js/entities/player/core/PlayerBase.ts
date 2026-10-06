import Entity from '../../../core/Entity.js';
import { withDamageable } from '../../../core/Damageable.js';
import {
    getXpForLevel,
    calculateMaxHp,
    calculateMeleeDamageBonus,
    calculateBowDamageBonus,
    calculateAvoidChance,
    calculateArmor,
    calculateMana
} from '../../../config/levelConfig.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import { cloneBaseStats } from '../../../config/creatureStats.js';
import { CreatureBaseStats } from '../../../config/creatureTypes.js';
import PlayerInventory from '../inventory/PlayerInventory.js';
import PlayerRenderer from './PlayerRenderer.js';
import { NextCharacterRollAllocation } from '../../../utils/NextCharacterRollConfig.js';
import Item from '../../Item.js';
import { PlayerCreationOptions, PlayerStat, RANDOM_NAME_POOL, RANDOM_STAT_POOL } from '../shared/PlayerTypes.js';

const DamageableEntity = withDamageable(Entity);

export default class PlayerBase extends DamageableEntity {
    declare x: number;
    declare y: number;
    declare width: number;
    declare height: number;
    declare active: boolean;
    declare id: number;
    declare hp: number;
    declare maxHp: number;
    declare initDamageable: (maxHp: number) => void;
    declare heal: (amount: number) => void;
    declare healToFull: () => void;
    declare isDead: () => boolean;

    public damage: number;
    public name: string;
    public armor: number = 0;
    public avoidChance: number = 0;
    public gridCol?: number;
    public gridRow?: number;
    public level: number = 1;
    public xp: number = 0;
    public xpToNextLevel: number;
    public vitality: number = 0;
    public toughness: number = 0;
    public strength: number = 0;
    public agility: number = 0;
    public connection: number = 0;
    public intelligence: number = 0;
    public skillPoints: number = 0;
    public magicPoints: number = 0;
    public mana: number = 0;
    public maxMana: number = 0;
    public gold: number = 0;
    public fatigue: number = 0;
    protected armorAbsorbedHp: number = 0;
    protected readonly inventorySystem: PlayerInventory;
    protected readonly renderer: PlayerRenderer;

    constructor(x: number, y: number, options: PlayerCreationOptions = {}) {
        super(x, y);
        const isRestoreMode = options.mode === 'restore';
        this.name = isRestoreMode ? '' : PlayerBase.generateRandomName();
        this.width = balanceConfig.player.width;
        this.height = balanceConfig.player.height;
        const startingSkillAllocation = 'startingSkillAllocation' in options ? options.startingSkillAllocation ?? null : null;
        this.initializePrimaryStats(startingSkillAllocation, !isRestoreMode);
        this.inventorySystem = this.createInventorySystem();
        this.renderer = new PlayerRenderer();
        this.updateStats();
        this.mana = this.maxMana;
        this.gold = Math.max(0, Math.floor(balanceConfig.player.initialGold ?? 0));
        this.xpToNextLevel = getXpForLevel(2);
        this.initDamageable(this.maxHp);
    }

    public get equippedMainWeapon(): Item | null { return this.inventorySystem.getEquippedMainWeapon(); }
    public get equippedOffhandWeapon(): Item | null { return this.inventorySystem.getEquippedOffhandWeapon(); }
    public get equippedArmor(): Item | null { return this.inventorySystem.getEquippedArmor(); }

    public set equippedArmor(armor: Item | null) { this.inventorySystem.setEquippedArmor(armor); }
    public getInventoryCapacityForStrength(strength: number): number {
        const safeStrength = Math.max(0, Math.floor(strength));
        const strengthSlots = Math.floor(safeStrength / balanceConfig.player.strengthPerInventorySlot);
        return balanceConfig.player.baseInventorySlots + strengthSlots;
    }

    public takeDamage(amount: number): boolean {
        if (amount <= 0) {return super.takeDamage(0);}
        const armor = this.equippedArmor;
        const reduction = armor?.effects.damageReductionPercent ?? 0;
        const reducedByPercent = Math.floor(amount * (1 - reduction));
        const cap = armor?.effects.maxAbsorbHp;
        const depleted = typeof cap === 'number' && this.armorAbsorbedHp >= cap;
        const effectiveArmor = depleted ? 0 : this.armor;
        const damageAfterArmor = Math.max(balanceConfig.combat.minDamageAfterArmor, reducedByPercent - effectiveArmor);
        if (effectiveArmor > 0 && typeof cap === 'number') {this.armorAbsorbedHp += Math.max(0, reducedByPercent - damageAfterArmor);}
        return super.takeDamage(damageAfterArmor);
    }

    public takeMagicDamage = (amount: number): boolean => super.takeDamage(Math.max(0, amount));

    public updateStats(): void {
        const previousMaxMana = this.maxMana;
        const previousMana = this.mana;
        const hadFullMana = previousMaxMana > 0 && previousMana === previousMaxMana;
        const armorFlatBonus = this.equippedArmor?.effects.flatArmor ?? 0;
        const baseStats = this.getBaseStatsRecord();
        this.maxMana = calculateMana(this.connection, this.intelligence) - balanceConfig.player.baseMana + baseStats.mana;
        this.armor = calculateArmor(this.toughness) + armorFlatBonus + baseStats.armor;
        this.maxHp = calculateMaxHp(this.vitality) - balanceConfig.player.baseHp + baseStats.hp;
        this.avoidChance = calculateAvoidChance(this.agility);
        this.recalculateWeaponDamage();
        this.mana = previousMaxMana === 0 || hadFullMana ? this.maxMana : Math.min(this.maxMana, previousMana);
    }

    protected recalculateWeaponDamage(): void {
        const meleeBonus = calculateMeleeDamageBonus(this.strength, this.agility);
        const rangedBonus = calculateBowDamageBonus(this.strength, this.agility);
        const fist = balanceConfig.combat.fistDamagePerHand;
        const mainWeapon = this.equippedMainWeapon;
        const offhandWeapon = this.equippedOffhandWeapon;
        if (!mainWeapon && !offhandWeapon) { this.damage = fist * 2 + (meleeBonus * 2); return; }
        if (mainWeapon?.handsRequired === 2) {
            this.damage = mainWeapon.damageBonus + (mainWeapon.isRanged ? rangedBonus : meleeBonus) + mainWeapon.getPlasmaBonusDamage();
            return;
        }
        const main = mainWeapon
            ? mainWeapon.damageBonus + (mainWeapon.isRanged ? rangedBonus : meleeBonus) + mainWeapon.getPlasmaBonusDamage()
            : fist + meleeBonus;
        const off = offhandWeapon
            ? offhandWeapon.damageBonus + (offhandWeapon.isRanged ? rangedBonus : meleeBonus) + offhandWeapon.getPlasmaBonusDamage()
            : fist + meleeBonus;
        this.damage = main + off;
    }

    public getBaseStatsRecord = (): CreatureBaseStats => cloneBaseStats(balanceConfig.creatureArchetypes.human.baseStats);

    public getInventoryCapacity = (): number => this.getInventoryCapacityForStrength(this.strength);
    public restoreMana(amount: number): void { if (amount > 0) {this.mana = Math.min(this.maxMana, this.mana + amount);} }
    public canEquipItem = (item: Item): boolean => this.agility >= (item.requirements.agility ?? 0) && this.strength >= (item.requirements.strength ?? 0);

    private createInventorySystem = (): PlayerInventory => new PlayerInventory({
        getInventoryCapacity: () => this.getInventoryCapacity(),
        onEquipmentChanged: () => this.updateStats(),
        onHealingPotionUsed: () => this.heal(5),
        onManaPotionUsed: () => this.restoreMana(balanceConfig.combat.manaPotionRestore),
        canEquip: (item) => this.canEquipItem(item),
    });

    private initializePrimaryStats(startingSkillAllocation: Partial<Record<PlayerStat, number>> | null, allocateStartingStats: boolean): void {
        this.vitality = balanceConfig.player.initialVitality;
        this.toughness = balanceConfig.player.initialToughness;
        this.strength = balanceConfig.player.initialStrength;
        this.agility = balanceConfig.player.initialAgility;
        this.connection = balanceConfig.player.initialConnection;
        this.intelligence = balanceConfig.player.initialIntelligence;
        this.skillPoints = balanceConfig.player.initialSkillPoints;
        if (allocateStartingStats) {
            this.allocateRandomStartingStats(startingSkillAllocation);
        }
        this.magicPoints = Math.floor(this.intelligence / 3);
    }

    private allocateRandomStartingStats(startingSkillAllocation: Partial<Record<PlayerStat, number>> | null = null): void {
        const pointsToAllocate = Math.max(0, balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0);
        const allocation = this.normalizeStartingSkillAllocation(startingSkillAllocation);
        if (RANDOM_STAT_POOL.reduce((sum, stat) => sum + allocation[stat], 0) === pointsToAllocate) {
            RANDOM_STAT_POOL.forEach((stat) => this[stat] += allocation[stat]);
            return;
        }

        for (let i = 0; i < pointsToAllocate; i++) {
            const stat = RANDOM_STAT_POOL[Math.floor(Math.random() * RANDOM_STAT_POOL.length)];
            this[stat] += 1;
        }
    }

    private normalizeStartingSkillAllocation(startingSkillAllocation: Partial<Record<PlayerStat, number>> | null): NextCharacterRollAllocation {
        const normalized: NextCharacterRollAllocation = { vitality: 0, toughness: 0, strength: 0, agility: 0, connection: 0, intelligence: 0 };
        RANDOM_STAT_POOL.forEach((stat) => {
            const rawAmount = startingSkillAllocation?.[stat] ?? 0;
            const parsed = typeof rawAmount === 'number' ? rawAmount : Number.parseInt(String(rawAmount), 10);
            normalized[stat] = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        });
        return normalized;
    }

    private static generateRandomName = (): string => RANDOM_NAME_POOL[Math.floor(Math.random() * RANDOM_NAME_POOL.length)];
}
