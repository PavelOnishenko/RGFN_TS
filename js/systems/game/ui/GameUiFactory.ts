/* eslint-disable style-guide/function-length-warning */
import { BattleUI, GameLogUI, GameUiBundle, VillageUI, WorldUI } from './GameUiTypes.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import { CombatMove } from '../../combat/DirectionalCombat.js';
import { GameHudElementsFactory } from '../runtime/GameHudElementsFactory.js';
import { GameDeveloperUiFactory } from '../runtime/GameDeveloperUiFactory.js';

export default class GameUiFactory {
    private readonly hudElementsFactory = new GameHudElementsFactory();
    private readonly developerUiFactory = new GameDeveloperUiFactory();

    public create = (): GameUiBundle => ({
        hudElements: this.hudElementsFactory.create(),
        worldUI: this.createWorldUi(),
        battleUI: this.createBattleUi(),
        villageUI: this.createVillageUi(),
        gameLogUI: this.createGameLogUi(),
        developerUI: this.developerUiFactory.create(),
    });

    private createBattleUi(): BattleUI {
        const fleeBtn = document.getElementById('flee-btn')! as HTMLButtonElement;
        const fleePercent = Math.round(balanceConfig.combat.fleeChance * 100);
        fleeBtn.textContent = `Flee (${fleePercent}%)`;
        const directionalButtons = {
            AttackLeft: document.getElementById('attack-left-btn')! as HTMLButtonElement,
            AttackCenter: document.getElementById('attack-center-btn')! as HTMLButtonElement,
            AttackRight: document.getElementById('attack-right-btn')! as HTMLButtonElement,
            Block: document.getElementById('block-btn')! as HTMLButtonElement,
            DodgeLeft: document.getElementById('dodge-left-btn')! as HTMLButtonElement,
            DodgeRight: document.getElementById('dodge-right-btn')! as HTMLButtonElement,
        } satisfies Record<CombatMove, HTMLButtonElement>;

        return {
            sidebar: document.getElementById('battle-sidebar')!,
            enemyName: document.getElementById('enemy-name')!,
            enemyHp: document.getElementById('enemy-hp')!,
            enemyMaxHp: document.getElementById('enemy-max-hp')!,
            attackBtn: document.getElementById('attack-btn')! as HTMLButtonElement,
            directionalButtons,
            fleeBtn,
            waitBtn: document.getElementById('wait-btn')! as HTMLButtonElement,
            usePotionBtn: document.getElementById('battle-use-potion-btn')! as HTMLButtonElement,
            useManaPotionBtn: document.getElementById('battle-use-mana-potion-btn')! as HTMLButtonElement,
            spellFireballBtn: document.getElementById('spell-fireball-btn')! as HTMLButtonElement,
            spellCurseBtn: document.getElementById('spell-curse-btn')! as HTMLButtonElement,
            spellSlowBtn: document.getElementById('spell-slow-btn')! as HTMLButtonElement,
            spellRageBtn: document.getElementById('spell-rage-btn')! as HTMLButtonElement,
            spellArcaneLanceBtn: document.getElementById('spell-arcane-lance-btn')! as HTMLButtonElement,
            attackRangeText: document.getElementById('attack-range-text')!,
        };
    }

    private createWorldUi = (): WorldUI => ({
        sidebar: document.getElementById('world-sidebar')!,
        usePotionBtn: document.getElementById('world-use-potion-btn')! as HTMLButtonElement,
        enterVillageBtn: document.getElementById('world-enter-village-btn')! as HTMLButtonElement,
        campSleepBtn: document.getElementById('world-camp-sleep-btn')! as HTMLButtonElement,
        centerOnCharacterBtn: document.getElementById('world-center-on-character-btn')! as HTMLButtonElement,
        villageEntryPopup: document.getElementById('world-village-entry-popup')!,
        villageEntryTitle: document.getElementById('world-village-entry-title')!,
        villageEntryEnterBtn: document.getElementById('world-village-entry-enter-btn')! as HTMLButtonElement,
        villageEntryPassBtn: document.getElementById('world-village-entry-pass-btn')! as HTMLButtonElement,
        ferryPopup: document.getElementById('world-ferry-popup')!,
        ferryTitle: document.getElementById('world-ferry-title')!,
        ferryRouteSelect: document.getElementById('world-ferry-route-select')! as HTMLSelectElement,
        ferryPrice: document.getElementById('world-ferry-price')!,
        ferryConfirmBtn: document.getElementById('world-ferry-confirm-btn')! as HTMLButtonElement,
        ferryCancelBtn: document.getElementById('world-ferry-cancel-btn')! as HTMLButtonElement,
    });

    private createVillageUi = (): VillageUI => ({
        sidebar: document.getElementById('village-sidebar')!,
        rumorsPanel: document.getElementById('village-rumors-section')!,
        title: document.getElementById('village-title')!,
        prompt: document.getElementById('village-prompt')!,
        actions: document.getElementById('village-actions')!,
        sleepRoomBtn: document.getElementById('village-sleep-room-btn')! as HTMLButtonElement,
        dialogueModal: document.getElementById('village-dialogue-modal')!,
        dialogueCloseBtn: document.getElementById('village-dialogue-close-btn')! as HTMLButtonElement,
        dialogueSelectedNpc: document.getElementById('village-dialogue-selected-npc')!,
        dialogueLog: document.getElementById('village-dialogue-log')!,
        sideQuestPanel: document.getElementById('village-side-quest-panel')!,
        sideQuestList: document.getElementById('village-side-quest-list')!,
        enterBtn: document.getElementById('village-enter-btn')! as HTMLButtonElement,
        skipBtn: document.getElementById('village-skip-btn')! as HTMLButtonElement,
        doctorHealBtn: document.getElementById('village-doctor-heal-btn')! as HTMLButtonElement,
        innMealBtn: document.getElementById('village-inn-meal-btn')! as HTMLButtonElement,
        villageWaitBtn: document.getElementById('village-wait-btn')! as HTMLButtonElement,
        buyOffer1Btn: document.getElementById('village-buy-offer-1-btn')! as HTMLButtonElement,
        buyOffer2Btn: document.getElementById('village-buy-offer-2-btn')! as HTMLButtonElement,
        buyOffer3Btn: document.getElementById('village-buy-offer-3-btn')! as HTMLButtonElement,
        buyOffer4Btn: document.getElementById('village-buy-offer-4-btn')! as HTMLButtonElement,
        sellSelect: document.getElementById('village-sell-select')! as HTMLSelectElement,
        sellSelectedBtn: document.getElementById('village-sell-selected-btn')! as HTMLButtonElement,
        npcList: document.getElementById('village-npc-list')!,
        npcTitle: document.getElementById('village-npc-title')!,
        rosterVillageFilter: document.getElementById('village-roster-filter-select')! as HTMLSelectElement,
        rosterList: document.getElementById('village-roster-list')!,
        askVillageInput: document.getElementById('village-ask-settlement-input')! as HTMLSelectElement,
        askVillageBtn: document.getElementById('village-ask-settlement-btn')! as HTMLButtonElement,
        askNearbySettlementsBtn: document.getElementById('village-ask-nearby-settlements-btn')! as HTMLButtonElement,
        askPersonInput: document.getElementById('village-ask-person-input')! as HTMLSelectElement,
        askPersonBtn: document.getElementById('village-ask-person-btn')! as HTMLButtonElement,
        ...this.createVillageDialogueActionButtons(),
        leaveBtn: document.getElementById('village-leave-btn')! as HTMLButtonElement,
    });

    private createVillageDialogueActionButtons = (): Pick<
        VillageUI,
        'askBarterBtn' | 'barterNowBtn' | 'courierActionBtn' | 'confrontRecoverBtn' | 'recruitEscortBtn' | 'defendVillageBtn'
    > => ({
        askBarterBtn: document.getElementById('village-ask-barter-btn')! as HTMLButtonElement,
        barterNowBtn: document.getElementById('village-confirm-barter-btn')! as HTMLButtonElement,
        courierActionBtn: document.getElementById('village-courier-action-btn')! as HTMLButtonElement,
        confrontRecoverBtn: document.getElementById('village-confront-recover-btn')! as HTMLButtonElement,
        recruitEscortBtn: document.getElementById('village-recruit-escort-btn')! as HTMLButtonElement,
        defendVillageBtn: document.getElementById('village-defend-objective-btn')! as HTMLButtonElement,
    });

    private createGameLogUi(): GameLogUI {
        const logElement = document.getElementById('game-log')!;
        this.setupAutoScrollingGameLog(logElement);

        return { log: logElement };
    }

    private setupAutoScrollingGameLog(logElement: HTMLElement): void {
        const scrollToLatest = (): void => {
            logElement.scrollTop = logElement.scrollHeight;
        };

        const observer = new MutationObserver((mutations): void => {
            const hasAddedNodes = mutations.some((mutation) => mutation.addedNodes.length > 0);
            if (!hasAddedNodes) {
                return;
            }

            scrollToLatest();
        });

        observer.observe(logElement, { childList: true });
        scrollToLatest();
    }
}
