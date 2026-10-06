/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning */
import BattleMap from '../../systems/combat/BattleMap.js';
import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Player from '../../entities/player/Player.js';
import GameModeStateMachine, { MODES } from '../../systems/game/runtime/GameModeStateMachine.js';
import GameHudCoordinator from '../../systems/game/runtime/GameHudCoordinator.js';
import WorldModeController from '../../systems/world/worldMap/WorldModeController.js';
import { WorldUI } from '../../systems/game/ui/GameUiTypes.js';
import type { FerryRouteOption } from '../../systems/world-mode/WorldModeFerryPromptController.js';

export default class GameWorldInteractionRuntime {
    private isWorldMapMiddleDragActive = false;
    private worldMapDragPointer = { x: 0, y: 0 };
    private mouseMoveSecondWindow = -1;
    private mouseMoveCountInWindow = 0;
    private hoverChangeCountInWindow = 0;
    private rawMouseMoveEventsPerSecond = 0;
    private hoverTileChangesPerSecond = 0;

    public handleCanvasMove(event: MouseEvent, canvas: HTMLCanvasElement, stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, battleMap: BattleMap, hudCoordinator: GameHudCoordinator, player: Player): void {
        this.trackMouseMoveEvent();
        if (this.isWorldMapMiddleDragActive && stateMachine.isInState(MODES.WORLD_MAP)) {
            this.handleWorldMapMiddleDragMove(event, worldMap, player);
        }
        const rect = canvas.getBoundingClientRect();
        const worldX = (event.clientX - rect.left) * (canvas.width / rect.width);
        const worldY = (event.clientY - rect.top) * (canvas.height / rect.height);
        if (stateMachine.isInState(MODES.WORLD_MAP)) {
            const changed = worldMap.updateSelectedCellFromPixel(worldX, worldY);
            if (changed) {
                this.trackHoverTileChange();
                hudCoordinator.updateSelectedCell(worldMap.getSelectedCellInfo());
            }
            return;
        }
        if (stateMachine.isInState(MODES.BATTLE)) {
            battleMap.updateSelectedCellFromPixel(worldX, worldY);
            hudCoordinator.updateSelectedCell(battleMap.getSelectedCellInfo());
        }
    }

    public handleCanvasLeave(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, battleMap: BattleMap, hudCoordinator: GameHudCoordinator): void {
        this.isWorldMapMiddleDragActive = false;
        if (stateMachine.isInState(MODES.WORLD_MAP)) {
            worldMap.clearSelectedCell();
            hudCoordinator.updateSelectedCell(null);
            return;
        }
        if (stateMachine.isInState(MODES.BATTLE)) {
            battleMap.clearSelectedCell();
            hudCoordinator.updateSelectedCell(null);
        }
    }

    public handleWorldMapWheel(event: WheelEvent, stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, player: Player): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        event.preventDefault();
        const changed = event.deltaY < 0 ? worldMap.zoomIn() : worldMap.zoomOut();
        if (changed) {
            this.syncPlayerPixelPosition(worldMap, player);
        }
    }

    public handleWorldMapKeyboardZoom(direction: 'in' | 'out', stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, player: Player): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        const changed = direction === 'in' ? worldMap.zoomIn() : worldMap.zoomOut();
        if (changed) {
            this.syncPlayerPixelPosition(worldMap, player);
        }
    }

    public handleWorldMapMiddleDragStart(event: MouseEvent, stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>): void {
        if (event.button !== 1 || !stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        event.preventDefault();
        this.isWorldMapMiddleDragActive = true;
        this.worldMapDragPointer = { x: event.clientX, y: event.clientY };
        const stopDrag = (): void => { this.isWorldMapMiddleDragActive = false; };
        window.addEventListener('mouseup', stopDrag, { once: true });
        window.addEventListener('blur', stopDrag, { once: true });
    }

    public handleWorldMapMiddleDragMove(event: MouseEvent, worldMap: WorldMap, player: Player): void {
        const deltaX = event.clientX - this.worldMapDragPointer.x;
        const deltaY = event.clientY - this.worldMapDragPointer.y;
        this.worldMapDragPointer = { x: event.clientX, y: event.clientY };
        if (worldMap.panByPixels(deltaX, deltaY)) {
            this.syncPlayerPixelPosition(worldMap, player);
        }
    }

    public centerWorldMapOnPlayer(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, player: Player): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        worldMap.centerOnPlayer();
        this.syncPlayerPixelPosition(worldMap, player);
    }

    public tryEnterVillageFromWorldMap(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldModeController: WorldModeController, hudCoordinator: GameHudCoordinator): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        if (!worldModeController.tryEnterVillageAtCurrentPosition()) {
            hudCoordinator.addBattleLog('Stand on a village tile to enter it.', 'system');
        }
    }

    public confirmWorldVillageEntry(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldModeController: WorldModeController, hudCoordinator: GameHudCoordinator): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            worldModeController.dismissVillageEntryPrompt();
            return;
        }
        if (!worldModeController.confirmVillageEntryFromPrompt()) {
            hudCoordinator.addBattleLog('You must stand on the village tile to enter.', 'system');
        }
    }

    public showWorldVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }, canvas: HTMLCanvasElement): void {
        worldUI.villageEntryTitle.textContent = `You found ${villageName}.`;
        const width = worldUI.villageEntryPopup.offsetWidth || 190;
        const height = worldUI.villageEntryPopup.offsetHeight || 84;
        const { left, top } = this.getWorldPopupPlacement(anchor, { width, height }, canvas);
        worldUI.villageEntryPopup.style.left = `${left}px`;
        worldUI.villageEntryPopup.style.top = `${top}px`;
        worldUI.villageEntryPopup.classList.remove('hidden');
    }

    public hideWorldVillageEntryPrompt(worldUI: WorldUI): void {
        worldUI.villageEntryPopup.classList.add('hidden');
    }

    public showWorldFerryPrompt(
        worldUI: WorldUI,
        options: FerryRouteOption[],
        selectedRouteIndex: number,
        anchor: { x: number; y: number },
        canvas: HTMLCanvasElement,
    ): void {
        const clampedSelectedIndex = Math.max(0, Math.min(selectedRouteIndex, options.length - 1));
        worldUI.ferryRouteSelect.innerHTML = '';
        options.forEach((option, index) => {
            const element = document.createElement('option');
            element.value = String(index);
            element.textContent = `${option.destinationName} (${option.waterCells} water cells)`;
            worldUI.ferryRouteSelect.appendChild(element);
        });
        worldUI.ferryRouteSelect.selectedIndex = clampedSelectedIndex;

        const selectedOption = options[clampedSelectedIndex];
        const selectedPrice = selectedOption ? selectedOption.priceGold : 0;
        worldUI.ferryPrice.textContent = `${selectedPrice}g`;
        worldUI.ferryTitle.textContent = options.length > 1 ? 'Ferry routes available' : 'Ferry crossing';

        const width = worldUI.ferryPopup.offsetWidth || 230;
        const height = worldUI.ferryPopup.offsetHeight || 140;
        const { left, top } = this.getWorldPopupPlacement(anchor, { width, height }, canvas);
        worldUI.ferryPopup.style.left = `${left}px`;
        worldUI.ferryPopup.style.top = `${top}px`;
        worldUI.ferryPopup.classList.remove('hidden');
    }

    public hideWorldFerryPrompt(worldUI: WorldUI): void {
        worldUI.ferryPopup.classList.add('hidden');
    }

    private syncPlayerPixelPosition(worldMap: WorldMap, player: Player): void {
        const [x, y] = worldMap.getPlayerPixelPosition();
        player.x = x;
        player.y = y;
    }

    private getWorldPopupPlacement(anchor: { x: number; y: number }, popup: { width: number; height: number }, canvas: HTMLCanvasElement): { left: number; top: number } {
        const canvasRect = canvas.getBoundingClientRect();
        const viewportWidth = canvasRect.width > 0 ? canvasRect.width : canvas.width;
        const viewportHeight = canvasRect.height > 0 ? canvasRect.height : canvas.height;
        const scaleX = canvas.width > 0 ? viewportWidth / canvas.width : 1;
        const scaleY = canvas.height > 0 ? viewportHeight / canvas.height : 1;
        const popupMargin = 14;
        const anchorX = anchor.x * scaleX;
        const anchorY = anchor.y * scaleY;
        const maxLeft = Math.max(popupMargin, viewportWidth - popup.width - popupMargin);
        const maxTop = Math.max(popupMargin, viewportHeight - popup.height - popupMargin);

        return {
            left: Math.max(popupMargin, Math.min(maxLeft, anchorX - (popup.width / 2))),
            top: Math.max(popupMargin, Math.min(maxTop, anchorY - popup.height - 16)),
        };
    }

    public readonly getPointerDiagnosticsSnapshot = (): { rawMouseMoveEventsPerSecond: number; hoverTileChangesPerSecond: number } => ({
        rawMouseMoveEventsPerSecond: this.rawMouseMoveEventsPerSecond,
        hoverTileChangesPerSecond: this.hoverTileChangesPerSecond,
    });

    private trackMouseMoveEvent(): void {
        this.refreshMouseWindowIfNeeded();
        this.mouseMoveCountInWindow += 1;
        this.rawMouseMoveEventsPerSecond = this.mouseMoveCountInWindow;
    }

    private trackHoverTileChange(): void {
        this.refreshMouseWindowIfNeeded();
        this.hoverChangeCountInWindow += 1;
        this.hoverTileChangesPerSecond = this.hoverChangeCountInWindow;
    }

    private refreshMouseWindowIfNeeded(): void {
        const nowSecond = Math.floor(Date.now() / 1000);
        if (nowSecond === this.mouseMoveSecondWindow) {
            return;
        }
        this.mouseMoveSecondWindow = nowSecond;
        this.mouseMoveCountInWindow = 0;
        this.hoverChangeCountInWindow = 0;
    }
}
