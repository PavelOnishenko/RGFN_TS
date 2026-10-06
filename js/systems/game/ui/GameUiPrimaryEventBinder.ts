import VillageActionsController from '../../village/VillageActionsController.js';
import { BattleUI, HudElements, VillageUI, WorldUI } from './GameUiTypes.js';
import { CombatMove } from '../../combat/DirectionalCombat.js';
import { GameUiEventCallbacks } from './GameUiEventBinderTypes.js';

export default class GameUiPrimaryEventBinder {
    private canvas: HTMLCanvasElement;
    private hudElements: HudElements;
    private worldUI: WorldUI;
    private battleUI: BattleUI;
    private villageUI: VillageUI;
    private villageActionsController: VillageActionsController;
    private callbacks: GameUiEventCallbacks;

    constructor(
        canvas: HTMLCanvasElement,
        hudElements: HudElements,
        worldUI: WorldUI,
        battleUI: BattleUI,
        villageUI: VillageUI,
        villageActionsController: VillageActionsController,
        callbacks: GameUiEventCallbacks,
    ) {
        this.canvas = canvas;
        this.hudElements = hudElements;
        this.worldUI = worldUI;
        this.battleUI = battleUI;
        this.villageUI = villageUI;
        this.villageActionsController = villageActionsController;
        this.callbacks = callbacks;
    }

    public bind(villageNameProvider: () => string): void {
        this.bindBattleEvents();
        this.bindVillageEvents(villageNameProvider);
        this.bindCanvasEvents();
    }

    private bindCanvasEvents(): void {
        this.canvas.addEventListener('click', (event: MouseEvent) => this.callbacks.onCanvasClick(event));
        this.canvas.addEventListener('mousemove', (event: MouseEvent) => this.callbacks.onCanvasMove(event));
        this.canvas.addEventListener('mouseleave', () => this.callbacks.onCanvasLeave());
        this.canvas.addEventListener('wheel', (event: WheelEvent) => this.callbacks.onWorldMapWheel(event), { passive: false });
        this.canvas.addEventListener('mousedown', (event: MouseEvent) => this.callbacks.onWorldMapMiddleDragStart(event));
        this.canvas.addEventListener('auxclick', (event: MouseEvent) => this.preventMiddleClickDefault(event));
        document.addEventListener('keydown', (event: KeyboardEvent) => this.handleWorldZoomHotkeys(event));
    }

    private preventMiddleClickDefault(event: MouseEvent): void {
        if (event.button !== 1) {
            return;
        }

        event.preventDefault();
    }

    private handleWorldZoomHotkeys(event: KeyboardEvent): void {
        if (!event.ctrlKey) {
            return;
        }

        if (event.code === 'Equal' || event.code === 'NumpadAdd') {
            event.preventDefault();
            this.callbacks.onWorldMapKeyboardZoom('in');
            return;
        }

        if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
            event.preventDefault();
            this.callbacks.onWorldMapKeyboardZoom('out');
        }
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private bindBattleEvents(): void {
        this.battleUI.attackBtn.addEventListener('click', () => this.callbacks.onAttack());
        Object.entries(this.battleUI.directionalButtons).forEach(([move, button]) => {
            button.addEventListener('click', () => this.callbacks.onDirectionalCombatMove(move as CombatMove));
        });
        this.battleUI.fleeBtn.addEventListener('click', () => this.callbacks.onFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.callbacks.onWait());
        this.battleUI.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromBattle());
        this.battleUI.useManaPotionBtn.addEventListener('click', () => this.callbacks.onUseManaPotionFromBattle());
        this.battleUI.spellFireballBtn.addEventListener('click', () => this.callbacks.onCastSpell('fireball'));
        this.battleUI.spellCurseBtn.addEventListener('click', () => this.callbacks.onCastSpell('curse'));
        this.battleUI.spellSlowBtn.addEventListener('click', () => this.callbacks.onCastSpell('slow'));
        this.battleUI.spellRageBtn.addEventListener('click', () => this.callbacks.onCastSpell('rage'));
        this.battleUI.spellArcaneLanceBtn.addEventListener('click', () => this.callbacks.onCastSpell('arcane-lance'));
        this.hudElements.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromHud());
        this.hudElements.useManaPotionBtn.addEventListener('click', () => this.callbacks.onUseManaPotionFromHud());
        this.hudElements.newCharacterBtn.addEventListener('click', () => this.callbacks.onNewCharacter());
        this.worldUI.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromWorld());
        this.worldUI.enterVillageBtn.addEventListener('click', () => this.callbacks.onEnterVillageFromWorld());
        this.worldUI.campSleepBtn.addEventListener('click', () => this.callbacks.onCampSleepFromWorld());
        this.worldUI.centerOnCharacterBtn.addEventListener('click', () => this.callbacks.onCenterWorldMapOnPlayer());
        this.worldUI.villageEntryEnterBtn.addEventListener('click', () => this.callbacks.onConfirmVillageEntryPrompt());
        this.worldUI.villageEntryPassBtn.addEventListener('click', () => this.callbacks.onDismissVillageEntryPrompt());
        this.worldUI.ferryRouteSelect.addEventListener('change', () => this.callbacks.onFerryRouteSelectionChanged(this.worldUI.ferryRouteSelect.selectedIndex));
        this.worldUI.ferryConfirmBtn.addEventListener('click', () => this.callbacks.onConfirmFerryTravelPrompt());
        this.worldUI.ferryCancelBtn.addEventListener('click', () => this.callbacks.onDismissFerryTravelPrompt());
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private bindVillageEvents(villageNameProvider: () => string): void {
        this.villageUI.enterBtn.addEventListener('click', () => this.villageActionsController.handleEnter(villageNameProvider()));
        this.villageUI.skipBtn.addEventListener('click', () => this.villageActionsController.handleSkip());
        this.villageUI.doctorHealBtn.addEventListener('click', () => this.villageActionsController.handleDoctorTreatment());
        this.villageUI.innMealBtn.addEventListener('click', () => this.villageActionsController.handleInnMeal());
        this.villageUI.villageWaitBtn.addEventListener('click', () => this.villageActionsController.handleVillageWait());
        this.villageUI.buyOffer1Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(0));
        this.villageUI.buyOffer2Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(1));
        this.villageUI.buyOffer3Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(2));
        this.villageUI.buyOffer4Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(3));
        this.villageUI.sellSelect.addEventListener('focus', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelect.addEventListener('pointerdown', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelect.addEventListener('change', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelectedBtn.addEventListener('click', () => this.villageActionsController.handleSellSelected());
        this.villageUI.askVillageInput.addEventListener('change', () => this.villageActionsController.updateButtons());
        this.villageUI.dialogueCloseBtn.addEventListener('click', () => this.villageActionsController.closeDialogueWindow());
        this.villageUI.dialogueModal.addEventListener('click', (event: MouseEvent) => this.closeDialogueFromOverlay(event));
        document.addEventListener('keydown', (event: KeyboardEvent) => this.handleDialogueCloseHotkeys(event));
        this.villageUI.askVillageBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutSettlement());
        this.villageUI.askNearbySettlementsBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutNearbySettlements());
        this.villageUI.askPersonInput.addEventListener('change', () => this.villageActionsController.updateButtons());
        this.villageUI.askPersonBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutPerson());
        this.villageUI.askBarterBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutBarter());
        this.villageUI.barterNowBtn.addEventListener('click', () => this.villageActionsController.handleConfirmBarter());
        this.villageUI.courierActionBtn.addEventListener('click', () => this.villageActionsController.handleCourierAction());
        this.villageUI.confrontRecoverBtn.addEventListener('click', () => this.villageActionsController.handleConfrontRecoverTarget());
        this.villageUI.recruitEscortBtn.addEventListener('click', () => this.villageActionsController.handleRecruitEscort());
        this.villageUI.defendVillageBtn.addEventListener('click', () => this.villageActionsController.handleStartDefendObjective());
        this.villageUI.sleepRoomBtn.addEventListener('click', () => this.villageActionsController.handleSleepInRoom());
        this.villageUI.leaveBtn.addEventListener('click', () => this.villageActionsController.handleLeave());
    }

    private closeDialogueFromOverlay(event: MouseEvent): void {
        if (event.target === this.villageUI.dialogueModal) {
            this.villageActionsController.closeDialogueWindow();
        }
    }

    private handleDialogueCloseHotkeys(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || this.villageUI.dialogueModal.classList.contains('hidden')) {
            return;
        }

        event.preventDefault();
        this.villageActionsController.closeDialogueWindow();
    }
}
