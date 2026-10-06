import InputManager from '../InputManager.js';
import { Direction } from '../../types/game.js';
import WorldMap from '../world/worldMap/WorldMap.js';

export default class WorldModeMovementInput {
    private input: InputManager;
    private worldMap: WorldMap;

    constructor(input: InputManager, worldMap: WorldMap) {
        this.input = input;
        this.worldMap = worldMap;
    }

    public handleMapViewportInput(): void {
        if (this.input.wasActionPressed('worldMapPanUp')) {
            this.worldMap.pan('up');
        }
        if (this.input.wasActionPressed('worldMapPanDown')) {
            this.worldMap.pan('down');
        }
        if (this.input.wasActionPressed('worldMapPanLeft')) {
            this.worldMap.pan('left');
        }
        if (this.input.wasActionPressed('worldMapPanRight')) {
            this.worldMap.pan('right');
        }
    }

    public getPendingMoveDirection(): Direction | null {
        const upPressed = this.wasMoveTriggered('moveUp');
        const downPressed = this.wasMoveTriggered('moveDown');
        const leftPressed = this.wasMoveTriggered('moveLeft');
        const rightPressed = this.wasMoveTriggered('moveRight');

        const diagonal = this.getPendingDiagonalMove(upPressed, downPressed, leftPressed, rightPressed);
        if (diagonal) {return diagonal;}

        if (upPressed) {
            return 'up';
        }
        if (downPressed) {
            return 'down';
        }
        if (leftPressed) {
            return 'left';
        }
        if (rightPressed) {
            return 'right';
        }

        return null;
    }

    private getPendingDiagonalMove(upPressed: boolean, downPressed: boolean, leftPressed: boolean, rightPressed: boolean): Direction | null {
        if (upPressed && leftPressed) {return 'upLeft';}
        if (upPressed && rightPressed) {return 'upRight';}
        if (downPressed && leftPressed) {return 'downLeft';}
        if (downPressed && rightPressed) {return 'downRight';}
        if (upPressed && this.input.isActionActive('moveLeft')) {return 'upLeft';}
        if (upPressed && this.input.isActionActive('moveRight')) {return 'upRight';}
        if (downPressed && this.input.isActionActive('moveLeft')) {return 'downLeft';}
        if (downPressed && this.input.isActionActive('moveRight')) {return 'downRight';}
        if (leftPressed && this.input.isActionActive('moveUp')) {return 'upLeft';}
        if (leftPressed && this.input.isActionActive('moveDown')) {return 'downLeft';}
        if (rightPressed && this.input.isActionActive('moveUp')) {return 'upRight';}
        if (rightPressed && this.input.isActionActive('moveDown')) {return 'downRight';}
        return null;
    }

    public isActionPressed = (action: string): boolean => this.input.wasActionPressed(action);

    private wasMoveTriggered = (action: string): boolean => this.input.wasActionPressed(action);
}
