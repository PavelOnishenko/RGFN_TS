import VillageActionsController from '../../village/VillageActionsController.js';
import DeveloperEventController from '../../encounter/DeveloperEventController.js';
import { BattleUI, DeveloperUI, HudElements, VillageUI, WorldUI } from './GameUiTypes.js';
import GameUiPrimaryEventBinder from './GameUiPrimaryEventBinder.js';
import GameUiHudPanelController from './GameUiHudPanelController.js';
import GameUiDevStatBinder from './GameUiDevStatBinder.js';
import { GameUiEventCallbacks } from './GameUiEventBinderTypes.js';

export default class GameUiEventBinder {
    private primaryEventBinder: GameUiPrimaryEventBinder;
    private panelController: GameUiHudPanelController;
    private devStatBinder: GameUiDevStatBinder;

    constructor(
        canvas: HTMLCanvasElement,
        hudElements: HudElements,
        worldUI: WorldUI,
        battleUI: BattleUI,
        villageUI: VillageUI,
        developerUI: DeveloperUI,
        villageActionsController: VillageActionsController,
        developerEventController: DeveloperEventController,
        callbacks: GameUiEventCallbacks,
    ) {
        this.primaryEventBinder = new GameUiPrimaryEventBinder(
            canvas,
            hudElements,
            worldUI,
            battleUI,
            villageUI,
            villageActionsController,
            callbacks,
        );
        this.panelController = new GameUiHudPanelController(hudElements, callbacks);
        this.devStatBinder = new GameUiDevStatBinder(hudElements, developerUI, developerEventController, callbacks);
    }

    public bind(villageNameProvider: () => string): void {
        this.primaryEventBinder.bind(villageNameProvider);
        this.devStatBinder.bind();
        this.panelController.bind();
    }
}
