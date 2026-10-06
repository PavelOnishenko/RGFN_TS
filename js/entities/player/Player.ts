import PlayerPersistence from './core/PlayerPersistence.js';
import { NewPlayerCreationOptions } from './shared/PlayerTypes.js';

export { NewPlayerCreationOptions, PlayerCreationOptions, PlayerStat, RestoredPlayerCreationOptions } from './shared/PlayerTypes.js';

export default class Player extends PlayerPersistence {
    public static readonly createNew = (x: number = 0, y: number = 0, options: NewPlayerCreationOptions = {}): Player =>
        new Player(x, y, { ...options, mode: 'new' });

    public static fromSavedState(state: Record<string, unknown>, x: number = 0, y: number = 0): Player {
        const player = new Player(x, y, { mode: 'restore' });
        player.restoreState(state);
        return player;
    }
}
