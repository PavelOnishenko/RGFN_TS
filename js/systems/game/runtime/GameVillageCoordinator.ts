import { ForcedEncounterType } from '../../encounter/EncounterSystem.js';
import VillageActionsController from '../../village/VillageActionsController.js';
import VillageLifeRenderer from '../../village/life/VillageLifeRenderer.js';
import { BattleUI, HudElements, VillageUI, WorldUI } from '../ui/GameUiTypes.js';

export default class GameVillageCoordinator {
    private readonly hudElements: HudElements;
    private readonly battleUI: BattleUI;
    private readonly villageUI: VillageUI;
    private readonly worldUI: WorldUI;
    private readonly villageLifeRenderer: VillageLifeRenderer;
    private readonly villageActionsController: VillageActionsController;

    constructor(
        hudElements: HudElements,
        battleUI: BattleUI,
        villageUI: VillageUI,
        worldUI: WorldUI,
        villageLifeRenderer: VillageLifeRenderer,
        villageActionsController: VillageActionsController,
    ) {
        this.hudElements = hudElements;
        this.battleUI = battleUI;
        this.villageUI = villageUI;
        this.worldUI = worldUI;
        this.villageLifeRenderer = villageLifeRenderer;
        this.villageActionsController = villageActionsController;
    }

    public enterVillageMode(width: number, height: number, villageName: string): void {
        this.hudElements.modeIndicator.textContent = 'Village';
        this.worldUI.sidebar.classList.add('hidden');
        this.battleUI.sidebar.classList.add('hidden');
        this.villageLifeRenderer.initialize(width, height, villageName);
        this.villageActionsController.enterVillage(this.villageLifeRenderer.getVillageName());
    }

    public exitVillageMode(): void {
        this.villageActionsController.exitVillage();
    }

    public getVillageName = (): string => this.villageLifeRenderer.getVillageName();

    public getDeveloperEventLabel(type: ForcedEncounterType): string {
        const labels: Record<ForcedEncounterType, string> = {
            skeleton: 'Skeleton battle',
            zombie: 'Zombie battle',
            ninja: 'Ninja battle',
            darkKnight: 'Dark Knight battle',
            dragon: 'Dragon battle',
            item: 'Item discovery',
            none: 'No encounter',
            traveler: 'Wanderer',
        };
        return labels[type] ?? type;
    }
}
