import InputManager from '../InputManager.js';
import { registerBackquoteToggle } from '../developerHotkeys.js';

type GameInputSetupOptions = {
    onToggleDeveloperModal: () => void;
};

export default class GameInputSetup {
    private input: InputManager;
    private options: GameInputSetupOptions;

    constructor(input: InputManager, options: GameInputSetupOptions) {
        this.input = input;
        this.options = options;
    }

    public configure(): void {
        this.input.mapAction('moveUp', ['ArrowUp', 'KeyW']);
        this.input.mapAction('moveDown', ['ArrowDown', 'KeyS']);
        this.input.mapAction('moveLeft', ['ArrowLeft', 'KeyA']);
        this.input.mapAction('moveRight', ['ArrowRight', 'KeyD']);
        this.input.mapAction('worldMapPanUp', ['KeyI', 'Numpad8']);
        this.input.mapAction('worldMapPanDown', ['KeyK', 'Numpad2']);
        this.input.mapAction('worldMapPanLeft', ['KeyJ', 'Numpad4']);
        this.input.mapAction('worldMapPanRight', ['KeyL', 'Numpad6']);
        this.input.mapAction('enterVillage', ['Space']);

        document.addEventListener('keydown', (event: KeyboardEvent) => this.input.handleKeyDown(event));
        document.addEventListener('keyup', (event: KeyboardEvent) => this.input.handleKeyUp(event));

        registerBackquoteToggle(() => {
            this.options.onToggleDeveloperModal();
        }, { target: document });
    }
}
