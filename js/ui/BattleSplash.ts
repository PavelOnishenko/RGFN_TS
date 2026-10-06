import timingConfig from '../config/timingConfig.js';
import { BattleSplashView } from './BattleSplashView.js';

/**
 * BattleSplash - Displays themed splash screens for battle start and end events
 */
export class BattleSplash {
    private readonly view: BattleSplashView;
    private dismissTimeoutId: number | null = null;
    private dismissCallback: (() => void) | null = null;

    constructor() {
        this.view = new BattleSplashView((event: MouseEvent) => this.handleOverlayClick(event));
    }

    /**
     * Shows battle start splash screen
     * @param enemyCount - Number of enemies in the battle
     * @param callback - Function to call when splash is done
     */
    showBattleStart(enemyCount: number, callback: () => void): void {
        this.view.setContent('battle-start', enemyCount);
        this.view.applyThemeColors('battle-start');

        this.view.show(() => {
            this.scheduleDismiss(callback, timingConfig.battle.battleStartSplashDuration);
        });
    }

    /**
     * Shows battle end splash screen
     * @param result - Battle result ('victory' or 'defeat')
     * @param callback - Function to call when splash is done
     */
    showBattleEnd(result: 'victory' | 'defeat', callback: () => void): void {
        this.view.setContent(result);
        this.view.applyThemeColors(result);

        this.view.show(() => {
            this.scheduleDismiss(callback, timingConfig.battle.battleEndSplashDuration);
        });
    }

    /**
     * Schedules splash dismissal and allows left-click skipping
     */
    private scheduleDismiss(callback: () => void, duration: number): void {
        this.clearDismissTimeout();
        this.view.addOverlayClickListener();

        this.dismissCallback = callback;
        this.dismissTimeoutId = window.setTimeout(() => {
            this.dismiss();
        }, duration);
    }

    /**
     * Handles skip via left mouse click
     */
    private handleOverlayClick(event: MouseEvent): void {
        if (event.button !== 0) {return;}

        this.dismiss();
    }

    /**
     * Dismisses splash safely exactly once
     */
    private dismiss(): void {
        if (!this.view.isVisible() || !this.dismissCallback) {return;}

        const callback = this.dismissCallback;
        this.dismissCallback = null;

        this.clearDismissTimeout();
        this.view.removeOverlayClickListener();
        this.view.hide(callback);
    }

    /**
     * Clears pending dismiss timeout
     */
    private clearDismissTimeout(): void {
        if (this.dismissTimeoutId !== null) {
            window.clearTimeout(this.dismissTimeoutId);
            this.dismissTimeoutId = null;
        }
    }

    /**
     * Updates theme colors when theme changes
     * Call this when the user switches themes
     */
    updateTheme(): void {
        // Theme colors are reapplied before every show
    }
}
