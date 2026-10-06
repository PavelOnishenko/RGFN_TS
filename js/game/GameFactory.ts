import { GameFacade } from './GameFacade.js';
import { buildGameRuntime } from './GameRuntimeAssembly.js';
import { GameStartupState } from './runtime/GamePersistenceRuntime.js';

export function createGameRuntime(
    game: GameFacade,
    canvas: HTMLCanvasElement,
    startupState: GameStartupState,
    worldColumns: number,
    worldRows: number,
    worldCellSize: number,
): void {
    buildGameRuntime(game, canvas, startupState, worldColumns, worldRows, worldCellSize);
}
