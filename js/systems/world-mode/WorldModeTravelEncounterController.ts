import Item from '../../entities/Item.js';
import Player from '../../entities/player/Player.js';
import Wanderer from '../../entities/Wanderer.js';
import { ItemDiscoverySplash } from '../../ui/ItemDiscoverySplash.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { theme } from '../../config/ThemeConfig.js';
import EncounterSystem from '../encounter/EncounterSystem.js';
import WorldMap from '../world/worldMap/WorldMap.js';
import WorldModeFerryPromptController from './WorldModeFerryPromptController.js';
import WorldModeVillagePromptController from './WorldModeVillagePromptController.js';
import { WorldModeCallbacks } from './WorldModeTypes.js';

export default class WorldModeTravelEncounterController {
    private player: Player;
    private worldMap: WorldMap;
    private encounterSystem: EncounterSystem;
    private itemDiscoverySplash: ItemDiscoverySplash;
    private callbacks: WorldModeCallbacks;
    private villagePromptController: WorldModeVillagePromptController;
    private ferryPromptController: WorldModeFerryPromptController;

    constructor(
        player: Player,
        worldMap: WorldMap,
        encounterSystem: EncounterSystem,
        itemDiscoverySplash: ItemDiscoverySplash,
        callbacks: WorldModeCallbacks,
        villagePromptController: WorldModeVillagePromptController,
        ferryPromptController: WorldModeFerryPromptController,
    ) {
        this.player = player;
        this.worldMap = worldMap;
        this.encounterSystem = encounterSystem;
        this.itemDiscoverySplash = itemDiscoverySplash;
        this.callbacks = callbacks;
        this.villagePromptController = villagePromptController;
        this.ferryPromptController = ferryPromptController;
    }

    public onPlayerMoved(isPreviouslyDiscovered: boolean): void {
        const travelMinutes = this.getTravelMinutesForStep();
        const nightFatigueBoost = this.callbacks.isNightTime() ? 1.35 : 1;
        const fatigueScale = (travelMinutes / Math.max(1, theme.worldMap.cellTravelMinutes)) * nightFatigueBoost;
        this.callbacks.onAdvanceTime(travelMinutes, fatigueScale);
        this.player.restoreMana(1);
        this.callbacks.onUpdateHUD();
        if (this.handleArrivalPrompts()) {return;}
        this.encounterSystem.onPlayerMove();
        if (this.resolveQuestEncounter() || !this.encounterSystem.checkEncounter(isPreviouslyDiscovered)) {return;}
        this.handleEncounterResult(this.encounterSystem.generateEncounter(!isPreviouslyDiscovered));
    }

    private handleArrivalPrompts(): boolean {
        if (this.ferryPromptController.tryOpenFerryPromptAtCurrentPosition()) {return true;}
        const namedLocation = this.worldMap.getCurrentNamedLocation();
        if (namedLocation) {
            this.callbacks.onAddBattleLog(`You arrive at ${namedLocation}.`, 'system');
        }
        if (this.worldMap.isPlayerOnVillage()) {
            this.villagePromptController.openVillageEntryPrompt();
            return true;
        }
        this.villagePromptController.syncVillagePromptWithPlayerPosition();
        return false;
    }

    private handleEncounterResult(encounter: ReturnType<EncounterSystem['generateEncounter']>): void {
        if (encounter.type === 'battle') {
            this.callbacks.onStartBattle(encounter.enemies, this.worldMap.getCurrentTerrain().type);
            return;
        }
        if (encounter.type === 'none') {
            this.callbacks.onAddBattleLog('A dragon flies past without noticing you.', 'system');
            return;
        }
        if (encounter.type === 'item') {
            this.handleItemDiscovery(encounter.item);
            return;
        }
        if (encounter.type === 'traveler') {
            this.handleTravelerEncounter(encounter.traveler, encounter.isHostile);
        }
    }

    public confirmFerryTravel(): void {
        const selectedOption = this.ferryPromptController.getSelectedOption();
        if (!selectedOption) {
            this.callbacks.onAddBattleLog('No ferry route available from this dock.', 'system');
            return;
        }

        const result = this.ferryPromptController.confirmFerryTravelAtCurrentSelection(this.player.gold);
        if (!result.traveled) {
            if (result.reason === 'cannot_afford') {
                this.callbacks.onAddBattleLog(`Not enough gold for ferry fare (${selectedOption.priceGold}g required).`, 'system');
                return;
            }
            this.callbacks.onAddBattleLog('You are no longer standing on a valid ferry dock.', 'system');
            return;
        }

        this.player.gold -= selectedOption.priceGold;
        const ferryMinutes = Math.max(1, selectedOption.waterCells * 2);
        const ferryNightFatigueBoost = this.callbacks.isNightTime() ? 1.2 : 1;
        const ferryFatigueScale = Math.max(1, (ferryMinutes / Math.max(1, theme.worldMap.cellTravelMinutes)) * ferryNightFatigueBoost);
        this.callbacks.onAdvanceTime(ferryMinutes, ferryFatigueScale);
        this.callbacks.onAddBattleLog(`You pay ${selectedOption.priceGold}g to the ferryman.`, 'system');
        this.callbacks.onAddBattleLog(`The ferry departs and reaches ${selectedOption.destinationName} in about ${ferryMinutes} min.`, 'system');
        this.callbacks.onUpdateHUD();
        this.villagePromptController.syncVillagePromptWithPlayerPosition();
        this.ferryPromptController.syncFerryPromptWithPlayerPosition();
    }

    public handleCampSleep(): void {
        if (this.worldMap.isPlayerOnVillage()) {
            this.callbacks.onAddBattleLog('You are at a village. Rent a room from an innkeeper for safer sleep.', 'system');
            return;
        }

        this.callbacks.onAdvanceTime(8 * 60, 0.25);
        const recovered = this.player.recoverFatigue(balanceConfig.survival.wildSleepFatigueRecovery);
        this.callbacks.onAddBattleLog(`You camp in the wild and recover ${Math.round(recovered)} fatigue.`, 'player');

        if (Math.random() < balanceConfig.survival.wildSleepAmbushChance) {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert('Night ambush!');
            }
            this.callbacks.onAddBattleLog('Night ambush! You were caught off guard while sleeping.', 'enemy');
            if (this.resolveQuestEncounter()) {
                return;
            }

            const encounter = this.encounterSystem.generateMonsterBattleEncounter();
            this.callbacks.onStartBattle(encounter.enemies, this.worldMap.getCurrentTerrain().type);
            return;
        }

        this.callbacks.onAddBattleLog('The night is quiet. You wake up before dawn.', 'system');
        this.callbacks.onUpdateHUD();
    }

    private resolveQuestEncounter(): boolean {
        if (!this.encounterSystem.isEncounterTypeEnabled('monster')) {return false;}
        const questEncounter = this.callbacks.getQuestBattleEncounter();
        if (!questEncounter) {return false;}
        if (questEncounter.hint) {this.callbacks.onAddBattleLog(questEncounter.hint, 'system-message');}
        this.callbacks.onStartBattle(questEncounter.enemies, this.worldMap.getCurrentTerrain().type);
        return true;
    }

    private getTravelMinutesForStep(): number {
        const base = Math.max(1, theme.worldMap.cellTravelMinutes);
        const nightTimeMultiplier = this.callbacks.isNightTime() ? 1.5 : 1;
        if (this.worldMap.isPlayerOnRoad()) {return Math.round(base * nightTimeMultiplier);}
        const terrain = this.worldMap.getCurrentTerrain().type;
        if (terrain === 'forest') {return Math.round(base * 4 * nightTimeMultiplier);}
        if (terrain === 'grass') {return Math.round(base * 2 * nightTimeMultiplier);}
        return Math.round(base * nightTimeMultiplier);
    }

    private handleTravelerEncounter(traveler: Wanderer, isHostile: boolean): void {
        this.callbacks.onRememberTraveler(traveler, isHostile ? 'hostile' : 'peaceful');
        if (isHostile) {
            this.callbacks.onAddBattleLog(`${traveler.name} turns hostile! ${traveler.getEncounterDescription()}`, 'enemy');
            this.callbacks.onStartBattle([traveler], this.worldMap.getCurrentTerrain().type);
            return;
        }

        this.callbacks.onAddBattleLog(`${traveler.name} greets you and offers barter. ${traveler.getEncounterDescription()}`, 'system');
        const wantsAmbush = window.confirm('A peaceful wanderer appears. Attack first?');
        if (wantsAmbush) {
            this.callbacks.onAddBattleLog('You strike first!', 'player');
            this.callbacks.onStartBattle([traveler], this.worldMap.getCurrentTerrain().type);
            return;
        }

        this.tryBarter(traveler);
    }

    private tryBarter(traveler: Wanderer): void {
        const stock = traveler.getLootItems().filter((item) => item.type !== 'consumable');
        if (stock.length === 0) { this.callbacks.onAddBattleLog('The wanderer has nothing to barter.', 'system'); return; }
        const offer = stock[Math.floor(Math.random() * stock.length)];
        const price = Math.max(1, Math.floor(offer.goldValue * 0.7));
        if (this.player.gold < price) {
            this.callbacks.onAddBattleLog(`You cannot afford ${offer.name} (${price} gold).`, 'system');
            return;
        }
        if (!window.confirm(`Buy ${offer.name} for ${price} gold?`)) {
            this.callbacks.onAddBattleLog('You decline the barter and move on.', 'system');
            return;
        }
        if (!this.player.addItemToInventory(offer)) {
            this.callbacks.onAddBattleLog(`Inventory full. ${offer.name} could not be taken.`, 'system');
            return;
        }

        this.player.gold -= price;
        this.callbacks.onAddBattleLog(`You barter for ${offer.name}.`, 'system');
        this.callbacks.onUpdateHUD();
    }

    private handleItemDiscovery(item: Item): void {
        this.itemDiscoverySplash.showItemDiscovery(item, () => {
            if (!this.player.addItemToInventory(item)) {
                this.callbacks.onAddBattleLog(`Inventory full. ${item.name} was left behind.`, 'system');
            }
            this.callbacks.onUpdateHUD();
        });
    }
}
