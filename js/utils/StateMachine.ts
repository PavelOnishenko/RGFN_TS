/**
 * StateMachine - Simple state management
 * (Built for RGFN, might extract to engine if another game needs it)
 */
import { StateMachineCallbacks } from '../types/game.js';

export default class StateMachine {
    private states: Map<string, StateMachineCallbacks>;
    private currentState: string | null;
    private previousState: string | null;

    constructor(initialState: string | null = null) {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;

        if (initialState) {
            this.currentState = initialState;
        }
    }

    addState(name: string, callbacks: StateMachineCallbacks = {}): this {
        this.states.set(name, { enter: callbacks.enter ?? null, update: callbacks.update ?? null, exit: callbacks.exit ?? null });
        return this;
    }

    transition(newState: string, data: any = null): boolean {
        if (!this.states.has(newState)) {
            console.warn(`State "${newState}" does not exist`);
            return false;
        }

        if (this.currentState === newState) {
            return false;
        }

        // Exit current state
        if (this.currentState) {
            const currentStateObj = this.states.get(this.currentState);
            if (currentStateObj?.exit) {
                currentStateObj.exit(data);
            }
        }

        // Update state tracking
        this.previousState = this.currentState;
        this.currentState = newState;

        // Enter new state
        const newStateObj = this.states.get(newState);
        if (newStateObj?.enter) {
            newStateObj.enter(data);
        }

        return true;
    }

    update(deltaTime: number, data: any = null): void {
        if (!this.currentState) {
            return;
        }

        const state = this.states.get(this.currentState);
        if (state?.update) {
            state.update(deltaTime, data);
        }
    }

    readonly getCurrentState = (): string | null => this.currentState;

    readonly isInState = (stateName: string): boolean => this.currentState === stateName;
}
