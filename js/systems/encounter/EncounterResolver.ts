import { randomInt } from '../../utils/MathUtils.js';
import Skeleton, { EnemyConfig } from '../../entities/Skeleton.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY, HEALING_POTION_ITEM, MANA_POTION_ITEM } from '../../entities/Item.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { applyRandomEnchantmentsToGeneratedItem } from '../../entities/items/WeaponEnchantments.js';
import { assignMonsterBehaviorPool } from '../combat/MonsterBehaviorDirector.js';
import type { EncounterResult, ForcedEncounterType, RandomEncounterType } from './EncounterSystem.js';
import Wanderer from '../../entities/Wanderer.js';

type EncounterEventType = 'monster' | 'item' | 'traveler';

type EncounterRolls = {
    rollEncounterEventType: () => EncounterEventType;
    rollEncounterType: () => string;
};

type EncounterGenerationOptions = {
    canDiscoverItems?: boolean;
    enabledEventTypes?: RandomEncounterType[];
};

export default class EncounterResolver {
    private forcedEncounters: ForcedEncounterType[];
    constructor() {
        this.forcedEncounters = [];
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public generateEncounter(itemDiscoveryChance: number, rolls: EncounterRolls, options: EncounterGenerationOptions = {}): EncounterResult {
        const { canDiscoverItems = true, enabledEventTypes = ['monster', 'item', 'traveler'] } = options;

        if (enabledEventTypes.length === 0) {
            return { type: 'none' };
        }

        if (canDiscoverItems && enabledEventTypes.includes('item') && Math.random() < itemDiscoveryChance) {
            return this.createRandomItemEncounter();
        }

        if (this.forcedEncounters.length > 0) {
            const forcedType = this.forcedEncounters.shift();
            if (forcedType) {
                return this.createForcedEncounter(forcedType);
            }
        }

        const eventType = rolls.rollEncounterEventType();

        if (eventType === 'item') {
            if (canDiscoverItems) {
                return this.createRandomItemEncounter();
            }

            return { type: 'battle', enemies: this.createEnemiesForEncounter(rolls.rollEncounterType()) };
        }

        if (eventType === 'traveler') {
            return this.createTravelerEncounter();
        }

        const encounterType = rolls.rollEncounterType();
        if (encounterType === 'dragon') {
            return this.createDragonEncounter();
        }

        return { type: 'battle', enemies: this.createEnemiesForEncounter(encounterType) };
    }

    public queueForcedEncounter(type: ForcedEncounterType): void {
        this.forcedEncounters.push(type);
    }

    public clearForcedEncounters = (): void => {
        this.forcedEncounters = [];
    };

    public getForcedEncounterQueue = (): ForcedEncounterType[] => [...this.forcedEncounters];

    // eslint-disable-next-line style-guide/function-length-warning
    private createRandomItemEncounter(): EncounterResult {
        const _discoverableItems: Item[] = [new Item(HEALING_POTION_ITEM), new Item(MANA_POTION_ITEM)];
        const weightedPool = balanceConfig.items.discoveryPool;
        const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);

        if (totalWeight <= 0) {
            return { type: 'item', item: new Item(HEALING_POTION_ITEM) };
        }

        let roll = Math.random() * totalWeight;
        for (const candidate of weightedPool) {
            roll -= candidate.weight;
            if (roll <= 0) {
                const itemData = DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === candidate.id);
                if (itemData) {
                    return { type: 'item', item: applyRandomEnchantmentsToGeneratedItem(new Item(itemData)) };
                }
            }
        }

        return { type: 'item', item: new Item(HEALING_POTION_ITEM) };
    }

    private createDragonEncounter(): EncounterResult {
        const dragon = this.createEnemy(balanceConfig.enemies.dragon);
        if (dragon.shouldPassEncounter()) {
            return { type: 'none' };
        }

        return { type: 'battle', enemies: [dragon] };
    }

    private createForcedEncounter(type: ForcedEncounterType): EncounterResult {
        if (type === 'none') {
            return { type: 'none' };
        }

        if (type === 'item') {
            return this.createRandomItemEncounter();
        }

        if (type === 'traveler') {
            return this.createTravelerEncounter();
        }

        if (type === 'dragon') {
            return { type: 'battle', enemies: [this.createEnemy(balanceConfig.enemies.dragon)] };
        }

        return { type: 'battle', enemies: this.createEnemiesForEncounter(type) };
    }


    private createTravelerEncounter(): EncounterResult {
        const traveler = Wanderer.createRandom();
        const isHostile = Math.random() < 0.5;
        return { type: 'traveler', traveler, isHostile };
    }
    // eslint-disable-next-line style-guide/function-length-warning
    private createEnemiesForEncounter(encounterType: string): Skeleton[] {
        if (encounterType === 'skeleton') {
            return this.createEnemyGroup(
                balanceConfig.enemies.skeleton,
                balanceConfig.encounters.minEnemies,
                balanceConfig.encounters.maxEnemies
            );
        }

        if (encounterType === 'zombie') {
            return this.createEnemyGroup(
                balanceConfig.enemies.zombie,
                balanceConfig.encounters.zombieMinGroup,
                balanceConfig.encounters.zombieMaxGroup
            );
        }

        const configMap: Record<string, EnemyConfig> = { ninja: balanceConfig.enemies.ninja, darkKnight: balanceConfig.enemies.darkKnight };

        const config = configMap[encounterType] ?? balanceConfig.enemies.skeleton;
        return [this.createEnemy(config)];
    }


    private createEnemy(config: EnemyConfig): Skeleton {
        const enemy = new Skeleton(0, 0, config);
        assignMonsterBehaviorPool(enemy);
        return enemy;
    }

    private createEnemyGroup(config: EnemyConfig, min: number, max: number): Skeleton[] {
        const count = randomInt(min, max);
        const enemies: Skeleton[] = [];

        for (let i = 0; i < count; i++) {
            enemies.push(this.createEnemy(config));
        }

        return enemies;
    }
}
