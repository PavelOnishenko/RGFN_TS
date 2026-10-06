import { randomInt } from '../utils/MathUtils.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { deriveCreatureStats, formatCreatureSkills, normalizeCreatureSkills } from '../config/creatureStats.js';
import { calculateBowDamageBonus, calculateMeleeDamageBonus } from '../config/levelConfig.js';
import { CreatureSkill, CreatureSkills, CREATURE_SKILLS } from '../config/creatureTypes.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY } from './Item.js';
import Skeleton from './Skeleton.js';

const ITEM_ROLLS_BY_LEVEL = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6];

export default class Wanderer extends Skeleton {
    public level: number;
    private armorAbsorbedHp: number;
    private inventory: Item[];
    private equippedWeapon: Item | null;
    private equippedArmor: Item | null;

    constructor(level: number, inventory: Item[]) {
        super(0, 0, { archetypeId: 'human', xpValue: 3 * level, name: `Wanderer Lv.${level}`, width: 30, height: 30 });
        this.level = level;
        this.armorAbsorbedHp = 0;
        this.inventory = inventory;
        this.equippedWeapon = null;
        this.equippedArmor = null;
        this.rollSkills();
        this.chooseBestEquipment();
        this.refreshDerivedStats();
    }

    public get vitality(): number { return this.skills.vitality; }
    public get toughness(): number { return this.skills.toughness; }
    public get strength(): number { return this.skills.strength; }
    public get agility(): number { return this.skills.agility; }
    public get connection(): number { return this.skills.connection; }
    public get intelligence(): number { return this.skills.intelligence; }

    public static createRandom(): Wanderer {
        const level = this.rollLevel();
        return new Wanderer(level, this.rollInventory(level));
    }

    public canUseMagic = (): boolean => this.magicPoints > 0 && this.mana >= this.getMagicManaCost();

    public getMagicDamage = (): number => 2 + this.magicPoints + Math.floor(this.skills.intelligence / 4);

    public spendMana = (amount: number): void => void (this.mana = Math.max(0, this.mana - amount));

    public getMagicManaCost = (): number => 2;

    public getAttackRange = (): number => this.equippedWeapon?.attackRange ?? 1;

    public getLootItems = (): Item[] => [...this.inventory];

    public getEncounterDescription(): string {
        const skills = formatCreatureSkills(this.skills);
        const magic = this.magicPoints > 0
            ? `Magic ${this.magicPoints} (damage ${this.getMagicDamage()}, mana cost ${this.getMagicManaCost()})`
            : 'No magic';
        const equippedWeapon = this.equippedWeapon?.name ?? 'Bare hands';
        const equippedArmor = this.equippedArmor?.name ?? 'No armor';

        return `Base profile: HP ${this.baseStats.hp}, DMG ${this.baseStats.damage}, ARM ${this.baseStats.armor}, Mana ${this.baseStats.mana}. `
            + `Resulting stats: HP ${this.maxHp}, DMG ${this.damage}, ARM ${this.armor}, Mana ${this.maxMana}. Skills: ${skills}. ${magic}. `
            + `Equipped: ${equippedWeapon}, ${equippedArmor}.`;
    }

    public takeDamage(amount: number): boolean {
        if (amount <= 0) {
            return super.takeDamage(0);
        }

        const reduction = this.equippedArmor?.effects.damageReductionPercent ?? 0;
        const reduced = Math.floor(amount * (1 - reduction));
        const cap = this.equippedArmor?.effects.maxAbsorbHp;
        const depleted = typeof cap === 'number' && this.armorAbsorbedHp >= cap;
        const armor = depleted ? 0 : this.armor;
        const finalDamage = Math.max(balanceConfig.combat.minDamageAfterArmor, reduced - armor);
        const absorbed = Math.max(0, reduced - finalDamage);

        if (typeof cap === 'number' && absorbed > 0) {
            this.armorAbsorbedHp += absorbed;
        }

        return this.takeMagicDamage(finalDamage);
    }

    public getSkillRecord = (): CreatureSkills => normalizeCreatureSkills(this.skills);

    private static rollLevel = (): number => (Math.random() < 0.9 ? randomInt(1, 9) : randomInt(10, 20));

    private static rollInventory(level: number): Item[] {
        const rolls = ITEM_ROLLS_BY_LEVEL[Math.min(ITEM_ROLLS_BY_LEVEL.length - 1, level - 1)] ?? 3;
        const inventory: Item[] = [];
        for (let i = 0; i < rolls; i++) {
            const randomIndex = randomInt(0, DISCOVERABLE_ITEM_LIBRARY.length - 1);
            inventory.push(new Item(DISCOVERABLE_ITEM_LIBRARY[randomIndex]));
        }
        return inventory;
    }

    private rollSkills(): void {
        let points = this.level * 5;

        while (points > 0) {
            const key = CREATURE_SKILLS[randomInt(0, CREATURE_SKILLS.length - 1)] as CreatureSkill;
            this.skills[key] += 1;
            points -= 1;
        }
    }

    private chooseBestEquipment(): void {
        const equippable = this.inventory.filter((item) => this.canEquip(item));
        const weapons = equippable.filter((item) => item.type === 'weapon');
        const armors = equippable.filter((item) => item.type === 'armor');
        this.equippedWeapon = this.pickBestWeapon(weapons);
        this.equippedArmor = this.pickBestArmor(armors);
    }

    private refreshDerivedStats(): void {
        const derived = deriveCreatureStats(this.baseStats, this.skills);
        this.maxHp = derived.maxHp;
        this.hp = this.maxHp;
        this.armor = derived.armor + (this.equippedArmor?.effects.flatArmor ?? 0);
        this.avoidChance = derived.avoidChance;
        this.maxMana = derived.maxMana;
        this.magicPoints = derived.magicPoints;
        this.mana = this.maxMana;
        this.damage = this.computeDamage();
    }

    private canEquip = (item: Item): boolean => this.skills.agility >= (item.requirements.agility ?? 0) && this.skills.strength >= (item.requirements.strength ?? 0);

    private computeDamage(): number {
        const meleeBonus = calculateMeleeDamageBonus(this.skills.strength, this.skills.agility);
        const rangedBonus = calculateBowDamageBonus(this.skills.strength, this.skills.agility);
        const fistBase = balanceConfig.combat.fistDamagePerHand;

        if (!this.equippedWeapon) {
            return (fistBase + meleeBonus) * 2;
        }

        const weaponStatBonus = this.equippedWeapon.isRanged ? rangedBonus : meleeBonus;

        if (this.equippedWeapon.handsRequired === 2) {
            return this.equippedWeapon.damageBonus + weaponStatBonus;
        }

        const offhandDamage = fistBase + meleeBonus;
        return this.equippedWeapon.damageBonus + weaponStatBonus + offhandDamage;
    }

    private pickBestWeapon = (items: Item[]): Item | null => (
        items.length === 0 ? null : items.reduce((best, current) => (current.damageBonus > best.damageBonus ? current : best))
    );

    private pickBestArmor = (items: Item[]): Item | null => (
        items.length === 0
            ? null
            : items.reduce((best, current) => (this.getArmorScore(current) > this.getArmorScore(best) ? current : best))
    );

    private getArmorScore(item: Item): number {
        const flat = item.effects.flatArmor ?? 0;
        const reduction = (item.effects.damageReductionPercent ?? 0) * 10;
        const absorb = (item.effects.maxAbsorbHp ?? 0) / 10;
        return flat + reduction + absorb;
    }
}
