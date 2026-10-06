import { theme } from '../config/ThemeConfig.js';

export type BattleSplashVisualType = 'battle-start' | 'victory' | 'defeat';

interface BattleSplashElements {
    overlay: HTMLElement;
    modal: HTMLElement;
    title: HTMLElement;
    subtitle: HTMLElement;
    decorativeBorder: HTMLElement;
}

/**
 * BattleSplashView manages the splash DOM and visual presentation.
 * It keeps rendering concerns out of BattleSplash's timing/callback flow.
 */
export class BattleSplashView {
    private readonly elements: BattleSplashElements;
    private readonly onOverlayClickBound: (event: MouseEvent) => void;

    constructor(onOverlayClick: (event: MouseEvent) => void) {
        this.elements = this.createUI();
        this.onOverlayClickBound = (event: MouseEvent) => onOverlayClick(event);
    }

    setContent(type: BattleSplashVisualType, enemyCount?: number): void {
        const { title, subtitle } = this.elements;

        switch (type) {
            case 'battle-start':
                title.textContent = 'BATTLE START!';
                subtitle.textContent = `Prepare to face ${enemyCount ?? 0} ${(enemyCount ?? 0) === 1 ? 'enemy' : 'enemies'}!`;
                break;
            case 'victory':
                title.textContent = '⚔️ VICTORY! ⚔️';
                subtitle.textContent = 'The battle has been won!';
                break;
            case 'defeat':
                title.textContent = '💀 DEFEAT 💀';
                subtitle.textContent = 'You have been vanquished...';
                break;
        }
    }

    applyThemeColors(type: BattleSplashVisualType): void {
        const { modal, title, subtitle, decorativeBorder } = this.elements;

        modal.style.backgroundColor = theme.ui.primaryBg;
        modal.style.borderColor = theme.ui.primaryAccent;
        decorativeBorder.style.borderColor = theme.ui.secondaryAccent;
        subtitle.style.color = theme.ui.primaryAccent;

        switch (type) {
            case 'battle-start':
                title.style.color = theme.ui.primaryAccent;
                modal.style.boxShadow = `0 0 40px ${theme.ui.primaryAccent}40`;
                break;
            case 'victory':
                title.style.color = theme.ui.primaryAccent;
                modal.style.boxShadow = `0 0 50px ${theme.ui.primaryAccent}60`;
                break;
            case 'defeat':
                title.style.color = theme.ui.enemyColor;
                decorativeBorder.style.borderColor = theme.ui.enemyColor;
                modal.style.boxShadow = `0 0 50px ${theme.ui.enemyColor}40`;
                break;
        }
    }

    show(animationDoneCallback: () => void): void {
        const { overlay, modal } = this.elements;

        modal.style.animation = 'none';
        void modal.offsetHeight;

        overlay.style.display = 'flex';
        modal.style.animation = 'battle-splash-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

        window.setTimeout(animationDoneCallback, 500);
    }

    hide(callback: () => void): void {
        const { overlay, modal } = this.elements;

        modal.style.animation = 'battle-splash-exit 0.4s ease-in';

        window.setTimeout(() => {
            overlay.style.display = 'none';
            callback();
        }, 400);
    }

    addOverlayClickListener(): void {
        this.elements.overlay.addEventListener('click', this.onOverlayClickBound);
    }

    removeOverlayClickListener(): void {
        this.elements.overlay.removeEventListener('click', this.onOverlayClickBound);
    }

    isVisible = (): boolean => this.elements.overlay.style.display !== 'none';

    private createUI(): BattleSplashElements {
        const overlay = document.createElement('div');
        overlay.className = 'battle-splash-overlay';
        overlay.style.display = 'none';

        const modal = document.createElement('div');
        modal.className = 'battle-splash-modal';

        const decorativeBorder = document.createElement('div');
        decorativeBorder.className = 'battle-splash-border';

        const title = document.createElement('h1');
        title.className = 'battle-splash-title';

        const subtitle = document.createElement('p');
        subtitle.className = 'battle-splash-subtitle';

        modal.appendChild(decorativeBorder);
        modal.appendChild(title);
        modal.appendChild(subtitle);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        return { overlay, modal, title, subtitle, decorativeBorder };
    }
}
