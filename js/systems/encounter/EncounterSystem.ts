import { randomInt } from '../../utils/MathUtils.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import Item from '../../entities/Item.js';
import Skeleton from '../../entities/Skeleton.js';
import Wanderer from '../../entities/Wanderer.js';
import EncounterResolver from './EncounterResolver.js';

export type EncounterResult =
    | { type: 'battle', enemies: Skeleton[] }
    | { type: 'none' }
    | { type: 'item', item: Item }
    | { type: 'traveler', traveler: Wanderer, isHostile: boolean };

export type ForcedEncounterType = 'skeleton' | 'zombie' | 'ninja' | 'darkKnight' | 'dragon' | 'item' | 'none' | 'traveler';
export type RandomEncounterType = 'monster' | 'item' | 'traveler';

export const RANDOM_ENCOUNTER_TYPES: RandomEncounterType[] = ['monster', 'item', 'traveler'];

export default class EncounterSystem {
    private encounterRate: number;
    private stepsSinceEncounter: number;
    private itemDiscoveryChance: number;
    private encounterResolver: EncounterResolver;
    private encounterTypeStates: Record<RandomEncounterType, boolean>;

    constructor(encounterRate?: number) {
        this.encounterRate = encounterRate ?? balanceConfig.encounters.encounterRate;
        this.stepsSinceEncounter = 0;
        this.itemDiscoveryChance = 0.15;
        this.encounterResolver = new EncounterResolver();
        this.encounterTypeStates = this.createInitialEncounterTypeStates();
    }

    public onPlayerMove(): void {
        this.stepsSinceEncounter++;
    }

    public checkEncounter(isPreviouslyDiscovered: boolean = false): boolean {
        if (this.getForcedEncounterQueue().length > 0) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        const encounterRate = isPreviouslyDiscovered
            ? balanceConfig.encounters.discoveredEncounterRate
            : this.encounterRate;

        if (Math.random() < encounterRate) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        return false;
    }

    public generateEncounter(canDiscoverItems: boolean = true): EncounterResult {
        if (this.shouldSkipRandomEncounter()) {
            return { type: 'none' };
        }

        return this.encounterResolver.generateEncounter(this.itemDiscoveryChance, {
            rollEncounterEventType: () => this.rollEncounterEventType(),
            rollEncounterType: () => this.rollEncounterType(),
        }, { canDiscoverItems: canDiscoverItems && this.isEncounterTypeEnabled('item'), enabledEventTypes: this.getEnabledEncounterTypes() });
    }

    public generateMonsterBattleEncounter(): { type: 'battle'; enemies: Skeleton[] } {
        const encounter = this.encounterResolver.generateEncounter(this.itemDiscoveryChance, {
            rollEncounterEventType: () => 'monster',
            rollEncounterType: () => this.rollNonPassingMonsterEncounterType(),
        }, { canDiscoverItems: false, enabledEventTypes: ['monster'] });

        if (encounter.type === 'battle') {
            return encounter;
        }

        throw new Error(`Expected monster ambush to produce battle encounter, got "${encounter.type}".`);
    }

    public queueForcedEncounter(type: ForcedEncounterType): void {
        this.encounterResolver.queueForcedEncounter(type);
    }

    public clearForcedEncounters(): void {
        this.encounterResolver.clearForcedEncounters();
    }

    public getForcedEncounterQueue = (): ForcedEncounterType[] => this.encounterResolver.getForcedEncounterQueue();

    public setEncounterTypeEnabled = (type: RandomEncounterType, enabled: boolean): void => {
        this.encounterTypeStates[type] = enabled;
    };

    public setAllEncounterTypesEnabled(enabled: boolean): void {
        RANDOM_ENCOUNTER_TYPES.forEach((type) => {
            this.encounterTypeStates[type] = enabled;
        });
    }

    public isEncounterTypeEnabled = (type: RandomEncounterType): boolean => this.encounterTypeStates[type];

    public getEncounterTypeStates = (): Record<RandomEncounterType, boolean> => ({ ...this.encounterTypeStates });

    private createInitialEncounterTypeStates = (): Record<RandomEncounterType, boolean> => ({ monster: true, item: true, traveler: true });

    private shouldSkipRandomEncounter = (): boolean => this.getEnabledEncounterTypes().length === 0 && this.getForcedEncounterQueue().length === 0;

    private getEnabledEncounterTypes = (): RandomEncounterType[] => RANDOM_ENCOUNTER_TYPES.filter((type) => this.encounterTypeStates[type]);

    private rollEncounterEventType(): RandomEncounterType {
        const enabledTypes = this.getEnabledEncounterTypes();
        const configured = Array.isArray(balanceConfig.encounters.eventTypeWeights)
            ? balanceConfig.encounters.eventTypeWeights
            : [];
        const entries = this.getWeightedEncounterEntries(configured, enabledTypes);

        if (entries.length === 0) {
            return enabledTypes[0] ?? 'monster';
        }

        return this.selectEncounterEventType(entries);
    }

    private getWeightedEncounterEntries(
        configured: Array<{ type?: string; weight?: number }>,
        enabledTypes: RandomEncounterType[],
    ): Array<{ type: RandomEncounterType; weight: number }> {
        const enabledSet = new Set(enabledTypes);
        const entries: Array<{ type: RandomEncounterType; weight: number }> = [];

        configured.forEach((entry) => {
            const weight = Number(entry?.weight);
            const type = entry?.type as RandomEncounterType | undefined;
            if (enabledSet.has(type as RandomEncounterType) && weight > 0) {
                entries.push({ type: type as RandomEncounterType, weight });
            }
        });

        return entries;
    }

    private selectEncounterEventType(entries: Array<{ type: RandomEncounterType; weight: number }>): RandomEncounterType {
        const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const entry of entries) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.type;
            }
        }

        return entries[entries.length - 1].type;
    }


    private rollNonPassingMonsterEncounterType(): string {
        for (let attempt = 0; attempt < 8; attempt++) {
            const encounterType = this.rollEncounterType();
            if (encounterType !== 'dragon') {
                return encounterType;
            }
        }

        return 'skeleton';
    }

    private rollEncounterType(): string {
        const weights = balanceConfig.encounters.enemyWeights;
        const orderedTypes = ['skeleton', 'zombie', 'ninja', 'darkKnight', 'dragon'];
        const totalWeight = orderedTypes.reduce((sum, type) => sum + weights[type], 0);

        let roll = randomInt(0, totalWeight - 1);
        for (const type of orderedTypes) {
            roll -= weights[type];
            if (roll < 0) {
                return type;
            }
        }

        return 'skeleton';
    }
}
