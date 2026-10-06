import Item, { DISCOVERABLE_ITEM_LIBRARY } from '../../entities/Item.js';
import Skeleton from '../../entities/Skeleton.js';
import Wanderer from '../../entities/Wanderer.js';
import Player from '../../entities/player/Player.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { applyRandomEnchantmentsToGeneratedItem } from '../../entities/items/WeaponEnchantments.js';

type LootCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onEnemyDefeated?: (enemy: Skeleton) => void;
    getSelectedEnemy: () => Skeleton | null;
    setSelectedEnemy: (enemy: Skeleton | null) => void;
};

export default class BattleLootManager {
    private pendingLoot: Item[] = [];

    public handleKillRewards(target: Skeleton, player: Player, callbacks: LootCallbacks, participantCount: number = 1): void {
        callbacks.onAddBattleLog(`${target.name} defeated!`, 'system');
        callbacks.onEnemyDefeated?.(target);
        this.awardXp(target, player, callbacks, participantCount);
        this.collectLoot(target, callbacks, Math.max(1, Math.floor(participantCount)));
        if (callbacks.getSelectedEnemy() === target) {
            callbacks.setSelectedEnemy(null);
        }
    }

    public resolvePendingLoot(player: Player, callbacks: LootCallbacks): void {
        if (this.pendingLoot.length === 0) {
            return;
        }

        for (const item of this.pendingLoot) {
            if (player.addItemToInventory(item)) {
                callbacks.onAddBattleLog(`Looted ${item.name}.`, 'system');
                continue;
            }

            callbacks.onAddBattleLog(`Could not loot ${item.name}: inventory full.`, 'system');
        }

        this.pendingLoot = [];
        callbacks.onUpdateHUD();
    }

    public clearPendingLoot = (): void => {
        this.pendingLoot = [];
    };

    private awardXp(target: Skeleton, player: Player, callbacks: LootCallbacks, participantCount: number): void {
        if (!target.xpValue || target.xpValue <= 0) {
            return;
        }
        const shareCount = Math.max(1, Math.floor(participantCount));
        const playerShare = Math.max(1, Math.floor(target.xpValue / shareCount));
        const leveledUp = player.addXp(playerShare);
        callbacks.onAddBattleLog(`Gained ${playerShare} XP (${target.xpValue} total split across ${shareCount} allies).`, 'system');
        if (leveledUp) {
            callbacks.onAddBattleLog(`LEVEL UP! Now level ${player.level}!`, 'system');
            callbacks.onAddBattleLog(`Gained ${balanceConfig.leveling.skillPointsPerLevel} skill points! HP and mana fully restored!`, 'system');
        }
    }

    private collectLoot(target: Skeleton, callbacks: LootCallbacks, participantCount: number): void {
        const loot = this.getLootDrops(target);
        loot.forEach((item) => {
            if (participantCount > 1 && Math.random() > (1 / participantCount)) {
                callbacks.onAddBattleLog(`${item.name} was claimed by allied defenders.`, 'system-message');
                return;
            }
            this.pendingLoot.push(item);
            callbacks.onAddBattleLog(`${item.name} dropped. It will be collected after battle.`, 'system');
        });
    }

    private getLootDrops(target: Skeleton): Item[] {
        const loot: Item[] = [];
        const lootable = target as Skeleton & { getLootItems?: () => Item[] };
        if (lootable.getLootItems) {
            loot.push(...lootable.getLootItems());
        }
        if (target instanceof Wanderer) {
            return loot;
        }
        const randomDrop = this.rollMonsterDrop();
        if (randomDrop) {
            loot.push(randomDrop);
        }
        return loot;
    }

    private rollMonsterDrop(): Item | null {
        if (Math.random() >= balanceConfig.items.monsterDropChance) {
            return null;
        }
        const candidateId = this.rollFromWeightedPool();
        if (!candidateId) {
            return null;
        }
        const itemData = DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === candidateId);
        return itemData ? applyRandomEnchantmentsToGeneratedItem(new Item(itemData)) : null;
    }

    private rollFromWeightedPool(): string | null {
        const weightedPool = balanceConfig.items.discoveryPool;
        const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight <= 0) {
            return null;
        }
        let roll = Math.random() * totalWeight;
        for (const candidate of weightedPool) {
            roll -= candidate.weight;
            if (roll <= 0) {
                return candidate.id;
            }
        }
        return null;
    }
}
