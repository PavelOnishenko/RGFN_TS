import timingConfig from '../config/timingConfig.js';
import { theme } from '../config/ThemeConfig.js';
import Item from '../entities/Item.js';

/**
 * ItemDiscoverySplash - Displays splash screen when player discovers an item
 */
export class ItemDiscoverySplash {
    private overlay: HTMLElement | null = null;
    private modal: HTMLElement | null = null;
    private title: HTMLElement | null = null;
    private itemName: HTMLElement | null = null;
    private itemDescription: HTMLElement | null = null;
    private decorativeBorder: HTMLElement | null = null;
    private dismissTimeoutId: number | null = null;
    private dismissCallback: (() => void) | null = null;
    private onOverlayClickBound = (event: MouseEvent) => this.handleOverlayClick(event);

    constructor() {
        this.createUI();
    }

    /**
     * Creates the overlay UI structure
     */
    private createUI(): void {
        const overlay = this.createOverlay();
        const modal = this.createModal();
        const decorativeBorder = this.createDiv('item-discovery-border');
        const title = this.createTitle();
        const itemName = this.createHeading('h2', 'item-discovery-name');
        const itemDescription = this.createHeading('p', 'item-discovery-description');
        modal.appendChild(decorativeBorder);
        modal.appendChild(title);
        modal.appendChild(itemName);
        modal.appendChild(itemDescription);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.modal = modal;
        this.title = title;
        this.itemName = itemName;
        this.itemDescription = itemDescription;
        this.decorativeBorder = decorativeBorder;
    }

    private createOverlay(): HTMLDivElement {
        const overlay = this.createDiv('item-discovery-overlay');
        overlay.style.display = 'none';
        return overlay;
    }

    private createModal(): HTMLDivElement {
        return this.createDiv('item-discovery-modal');
    }

    private createTitle(): HTMLHeadingElement {
        const title = this.createHeading('h1', 'item-discovery-title');
        title.textContent = '🎁 ITEM DISCOVERED! 🎁';
        return title;
    }

    private createDiv(className: string): HTMLDivElement {
        const element = document.createElement('div');
        element.className = className;
        return element;
    }

    private createHeading<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
        const element = document.createElement(tag);
        element.className = className;
        return element;
    }

    /**
     * Shows item discovery splash screen
     * @param item - The discovered item
     * @param callback - Function to call when splash is done
     */
    showItemDiscovery(item: Item, callback: () => void): void {
        if (!this.overlay || !this.title || !this.itemName || !this.itemDescription) {return;}

        // Set content
        this.itemName.textContent = item.name;
        this.itemDescription.textContent = item.description;

        // Apply themed colors
        this.applyThemeColors();

        // Show with animation
        this.show(() => {
            // Hide after duration and call callback
            this.scheduleDismiss(callback, timingConfig.battle.itemDiscoverySplashDuration);
        });
    }

    /**
     * Schedules splash dismissal and allows left-click skipping
     */
    private scheduleDismiss(callback: () => void, duration: number): void {
        if (!this.overlay) {return;}

        this.clearDismissTimeout();
        this.overlay.addEventListener('click', this.onOverlayClickBound);

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
        if (!this.overlay || this.overlay.style.display === 'none' || !this.dismissCallback) {return;}

        const callback = this.dismissCallback;
        this.dismissCallback = null;

        this.clearDismissTimeout();
        this.overlay.removeEventListener('click', this.onOverlayClickBound);
        this.hide(callback);
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
     * Applies theme colors to splash screen elements
     */
    private applyThemeColors(): void {
        if (!this.modal || !this.title || !this.itemName || !this.itemDescription || !this.decorativeBorder) {return;}

        // Base styling - use theme colors
        this.modal.style.backgroundColor = theme.ui.primaryBg;
        this.modal.style.borderColor = theme.ui.primaryAccent;
        this.decorativeBorder.style.borderColor = theme.ui.secondaryAccent;

        // Item discovery specific colors
        this.title.style.color = '#FFD700'; // Gold color for item discovery
        this.itemName.style.color = theme.ui.primaryAccent;
        this.itemDescription.style.color = theme.ui.systemMessageColor;
        this.modal.style.boxShadow = `0 0 50px rgba(255, 215, 0, 0.6)`; // Gold glow
    }

    /**
     * Shows the splash screen with animation
     */
    private show(callback: () => void): void {
        if (!this.overlay || !this.modal) {return;}

        // Reset animation
        this.modal.style.animation = 'none';
        void this.modal.offsetHeight; // Trigger reflow

        // Show overlay
        this.overlay.style.display = 'flex';

        // Start animation
        this.modal.style.animation = 'item-discovery-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

        // Call callback after animation
        setTimeout(callback, 600);
    }

    /**
     * Hides the splash screen with animation
     */
    private hide(callback: () => void): void {
        if (!this.overlay || !this.modal) {return;}

        // Exit animation
        this.modal.style.animation = 'item-discovery-exit 0.5s ease-in';

        // Hide after animation and call callback
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
            callback();
        }, 500);
    }
}
