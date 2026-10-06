import { GameFacade } from '../GameFacade.js';
import GameBattleCoordinator from '../../systems/game/runtime/GameBattleCoordinator.js';
import GameHudCoordinator from '../../systems/game/runtime/GameHudCoordinator.js';
import GameUiEventBinder from '../../systems/game/ui/GameUiEventBinder.js';
import GameVillageCoordinator from '../../systems/game/runtime/GameVillageCoordinator.js';
import WorldModeController from '../../systems/world/worldMap/WorldModeController.js';
import VillageActionsController from '../../systems/village/VillageActionsController.js';
import DeveloperEventController from '../../systems/encounter/DeveloperEventController.js';
import { CombatMove } from '../../systems/combat/DirectionalCombat.js';
import { UIBundle } from '../GameFacade.js';

export default class GameRuntimeUiBinder {
    public constructor(
        private readonly game: GameFacade,
        private readonly canvas: HTMLCanvasElement,
        private readonly ui: UIBundle,
        private readonly villageActionsController: VillageActionsController,
        private readonly devController: DeveloperEventController,
        private readonly villageCoordinator: GameVillageCoordinator,
        private readonly battleCoordinator: GameBattleCoordinator,
        private readonly worldModeController: WorldModeController,
        private readonly hudCoordinator: GameHudCoordinator,
    ) {}

    public bind(): void {
        new GameUiEventBinder(
            this.canvas, this.ui.hudElements, this.ui.worldUI, this.ui.battleUI, this.ui.villageUI, this.ui.developerUI,this.villageActionsController,
            this.devController, this.createHandlers(),
        ).bind(() => this.villageCoordinator.getVillageName());
    }

    private readonly createHandlers = () => ({
        onAttack: () => this.battleCoordinator.handleAttack(),
        onDirectionalCombatMove: (move: CombatMove) => this.battleCoordinator.handleDirectionalCombatMove(move),
        onFlee: () => this.battleCoordinator.handleFlee(),
        onWait: () => this.battleCoordinator.handleWait(),
        onUsePotionFromBattle: () => this.battleCoordinator.handleUsePotion(true),
        onUseManaPotionFromBattle: () => this.battleCoordinator.handleUseManaPotion(true),
        onUsePotionFromHud: () => this.battleCoordinator.handleUsePotion(false),
        onUseManaPotionFromHud: () => this.battleCoordinator.handleUseManaPotion(false),
        onUsePotionFromWorld: () => this.battleCoordinator.handleUsePotion(false),
        onEnterVillageFromWorld: () => this.game.tryEnterVillageFromWorldMap(),
        onConfirmVillageEntryPrompt: () => this.game.confirmWorldVillageEntry(),
        onDismissVillageEntryPrompt: () => this.worldModeController.dismissVillageEntryPrompt(),
        onFerryRouteSelectionChanged: (index) => this.worldModeController.setFerryPromptRouteIndex(index),
        onConfirmFerryTravelPrompt: () => this.worldModeController.confirmFerryTravelFromPrompt(),
        onDismissFerryTravelPrompt: () => this.worldModeController.dismissFerryPrompt(),
        onCampSleepFromWorld: () => this.worldModeController.handleCampSleep(),
        onNewCharacter: () => this.game.startNewCharacter(),
        onAddStat: (stat) => this.hudCoordinator.handleAddStat(stat),
        onRemoveStat: (stat) => this.hudCoordinator.handleRemoveStat(stat),
        onSaveSkillChanges: () => this.hudCoordinator.handleSaveSkillChanges(),
        onGodSkillsBoost: () => this.game.onGodSkillsBoost(),
        onCastSpell: (id) => this.battleCoordinator.handleCastSpell(id),
        onUpgradeSpell: (id) => this.hudCoordinator.handleUpgradeSpell(id),
        onCanvasClick: (event) => this.battleCoordinator.handleCanvasClick(event, this.canvas),
        onCanvasMove: (event) => this.game.handleCanvasMove(event),
        onCanvasLeave: () => this.game.handleCanvasLeave(),
        onWorldMapWheel: (event) => this.game.handleWorldMapWheel(event),
        onWorldMapMiddleDragStart: (event) => this.game.handleWorldMapMiddleDragStart(event),
        onWorldMapKeyboardZoom: (direction) => this.game.handleWorldMapKeyboardZoom(direction),
        onCenterWorldMapOnPlayer: () => this.game.centerWorldMapOnPlayer(),
        onTogglePanel: (panel) => this.hudCoordinator.togglePanel(panel),
    });
}
