/* eslint-disable
    style-guide/file-length-error,
    style-guide/function-length-warning,
    style-guide/function-length-error,
    style-guide/rule17-comma-layout,
    style-guide/arrow-function-style
*/
import { HudElements } from './GameUiTypes.js';
import { GameUiEventCallbacks, HudPanelToggle } from './GameUiEventBinderTypes.js';
type PanelConfig = {
    key: HudPanelToggle | null;
    title: string;
    element: HTMLElement;
    closable?: boolean;
    persistenceKey?: string;
};
type LayoutContext = 'world' | 'battle';
type PanelLayoutSnapshot = {
    offsetX: number;
    offsetY: number;
    width: string | null;
    height: string | null;
    hidden: boolean;
    zIndex: number | null;
};
type StoredPanelLayout = Record<string, PanelLayoutSnapshot>;
export default class GameUiHudPanelController {
    private static readonly WORLD_LAYOUT_STORAGE_KEY = 'rgfn_hud_panel_layout_world_v1';
    private static readonly BATTLE_LAYOUT_STORAGE_KEY = 'rgfn_hud_panel_layout_battle_v1';
    private static readonly COMBAT_PANEL_PERSISTENCE_KEY = 'battleActions';
    private static readonly VILLAGE_ACTIONS_PANEL_PERSISTENCE_KEY = 'villageActions';
    private static readonly VILLAGE_RUMORS_PANEL_PERSISTENCE_KEY = 'villageRumors';
    private static readonly WORLD_INFO_PANEL_PERSISTENCE_KEY = 'worldInfo';
    private static readonly VILLAGE_ROSTER_PANEL_PERSISTENCE_KEY = 'villageRoster';
    private static readonly MODE_TEXT = {
        battle: 'Battle!',
        village: 'Village',
        world: 'World Map',
    } as const;
    private hudElements: HudElements;
    private callbacks: GameUiEventCallbacks;
    private nextPanelZIndex = 10;
    private readonly panelSpawnOrigin = { x: 24, y: 96 };
    private readonly panelSpawnStepY = 34;
    private readonly panelBorderDragThresholdPx = 8;
    private readonly panelResizeCornerPriorityPx = 18;
    private activeLayoutContext: LayoutContext = 'world';
    private selectedPanelHiddenBeforeVillage: boolean | null = null;
    constructor(hudElements: HudElements, callbacks: GameUiEventCallbacks) {
        this.hudElements = hudElements;
        this.callbacks = callbacks;
    }
    public bind(): void {
        this.bindHudMenuEvents();
        this.bindPanelToggleButtons();
        this.initializeHudPanelWindows();
        this.activeLayoutContext = this.getLayoutContextFromModeIndicator();
        this.restoreLayoutForCurrentContext();
        this.enforceCombatPanelVisibility(this.activeLayoutContext);
        this.bindLayoutContextListener();
    }
    private bindHudMenuEvents(): void {
        this.hudElements.hudMenuToggleBtn.addEventListener('click', () => {
            const menuIsClosed = this.hudElements.hudMenuPanel.classList.contains('hidden');
            this.setHudMenuOpen(menuIsClosed);
        });
    }
    private bindPanelToggleButtons(): void {
        this.hudElements.toggleStatsPanelBtn.addEventListener('click', () => this.handlePanelToggle('stats'));
        this.hudElements.toggleSkillsPanelBtn.addEventListener('click', () => this.handlePanelToggle('skills'));
        this.hudElements.toggleInventoryPanelBtn.addEventListener('click', () => this.handlePanelToggle('inventory'));
        this.hudElements.toggleMagicPanelBtn.addEventListener('click', () => this.handlePanelToggle('magic'));
        this.hudElements.toggleQuestsPanelBtn.addEventListener('click', () => this.handlePanelToggle('quests'));
        this.hudElements.toggleGroupPanelBtn.addEventListener('click', () => this.handlePanelToggle('group'));
        this.hudElements.toggleLorePanelBtn.addEventListener('click', () => this.handlePanelToggle('lore'));
        this.hudElements.toggleSelectedPanelBtn.addEventListener('click', () => this.handlePanelToggle('selected'));
        this.hudElements.toggleWorldMapPanelBtn.addEventListener('click', () => this.handlePanelToggle('worldMap'));
        this.hudElements.toggleLogPanelBtn.addEventListener('click', () => this.handlePanelToggle('log'));
        this.hudElements.toggleWorldInfoPanelBtn.addEventListener('click', () => this.handlePanelToggle('worldInfo'));
        this.hudElements.toggleRosterPanelBtn.addEventListener('click', () => this.handlePanelToggle('roster'));
        document.getElementById('world-info-open-roster-btn')?.addEventListener('click', () => this.handlePanelToggle('roster'));
    }
    private initializeHudPanelWindows(): void {
        this.getPanelConfigs().forEach(({ key, title, element, closable }, panelIndex) => this.decorateHudPanelWindow(key, title, element, panelIndex, closable ?? true));
    }
    private getPanelConfigs = (): PanelConfig[] => {
        const battleActionsPanel = document.getElementById('battle-sidebar');
        const villageActionsPanel = document.getElementById('village-actions');
        const villageRumorsPanel = document.getElementById('village-rumors-section');
        const villageRosterPanel = document.getElementById('village-roster-panel');
        const runtimePanels: PanelConfig[] = [
            ...(battleActionsPanel
                ? [{ key: null, title: 'Combat Actions', element: battleActionsPanel, closable: false, persistenceKey: 'battleActions' }]
                : []),
            ...(villageActionsPanel
                ? [{ key: null, title: 'Village Actions', element: villageActionsPanel, closable: false, persistenceKey: 'villageActions' }]
                : []),
            ...(villageRumorsPanel
                ? [{ key: null, title: 'Village Rumors', element: villageRumorsPanel, closable: false, persistenceKey: 'villageRumors' }]
                : []),
            ...(this.hudElements.worldInfoPanel
                ? [{
                    key: 'worldInfo' as const,
                    title: 'World Info',
                    element: this.hudElements.worldInfoPanel,
                    persistenceKey: GameUiHudPanelController.WORLD_INFO_PANEL_PERSISTENCE_KEY,
                }]
                : []),
            ...(villageRosterPanel
                ? [{
                    key: 'roster' as const,
                    title: 'NPC Roster',
                    element: villageRosterPanel,
                    persistenceKey: GameUiHudPanelController.VILLAGE_ROSTER_PANEL_PERSISTENCE_KEY,
                }]
                : []),
        ];
        return [
            { key: 'stats', title: 'Stats', element: this.hudElements.statsPanel },
            { key: 'skills', title: 'Skills', element: this.hudElements.skillsPanel },
            { key: 'inventory', title: 'Inventory', element: this.hudElements.inventoryPanel },
            { key: 'magic', title: 'Magic', element: this.hudElements.magicPanel },
            { key: 'quests', title: 'Quests', element: this.hudElements.questsPanel },
            { key: 'group', title: 'Group', element: this.hudElements.groupPanel },
            { key: 'lore', title: 'Lore', element: this.hudElements.lorePanel },
            { key: 'selected', title: 'Selected', element: this.hudElements.selectedPanel },
            { key: 'worldMap', title: 'World Map', element: this.hudElements.worldMapPanel },
            { key: 'log', title: 'Log', element: this.hudElements.logPanel },
            ...runtimePanels,
        ];
    };
    private decorateHudPanelWindow(panelKey: HudPanelToggle | null, title: string, panel: HTMLElement, panelIndex: number, closable: boolean): void {
        if (panel.querySelector('.panel-window-header')) {
            return;
        }
        panel.classList.add('draggable-panel');
        const header = document.createElement('div');
        header.className = 'panel-window-header';
        const dragHandle = document.createElement('div');
        dragHandle.className = 'panel-drag-handle';
        dragHandle.textContent = title;
        dragHandle.title = 'Drag to move panel';
        const cornerDragHandle = document.createElement('button');
        cornerDragHandle.className = 'panel-corner-drag-handle';
        cornerDragHandle.type = 'button';
        cornerDragHandle.textContent = '✥';
        cornerDragHandle.title = 'Drag to move panel';
        cornerDragHandle.setAttribute('aria-label', `Move ${title} panel`);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-btn panel-close-btn';
        closeBtn.type = 'button';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', `Close ${title} panel`);
        closeBtn.addEventListener('click', () => this.handlePanelClose(panelKey, panel));
        closeBtn.classList.toggle('hidden', !closable);
        closeBtn.disabled = !closable;
        header.append(dragHandle, closeBtn);
        panel.prepend(header);
        panel.append(cornerDragHandle);
        this.bindPanelDragEvents(panel, [dragHandle, cornerDragHandle]);
        this.bindPanelSpawnPositioning(panel, panelIndex);
        this.bindPanelPersistenceObserver(panel);
    }
    private handlePanelClose(panelKey: HudPanelToggle | null, panel: HTMLElement): void {
        if (panelKey !== null && !panel.classList.contains('hidden')) {
            this.callbacks.onTogglePanel(panelKey);
        }
        this.setHudMenuOpen(false);
    }
    private bindPanelDragEvents(panel: HTMLElement, dragHandles: HTMLElement[]): void {
        dragHandles.forEach((dragHandle) => {
            dragHandle.addEventListener('pointerdown', (event: PointerEvent) => {
                if (event.button !== 0) {
                    return;
                }
                this.startPanelDrag(event, panel, dragHandle);
            });
        });
        panel.addEventListener('pointerdown', (event: PointerEvent) => {
            if (!this.shouldStartBorderDrag(event, panel, dragHandles)) {
                return;
            }
            this.startPanelDrag(event, panel, panel);
        });
    }
    private shouldStartBorderDrag(event: PointerEvent, panel: HTMLElement, dragHandles: HTMLElement[]): boolean {
        if (event.button !== 0 || dragHandles.includes(event.target as HTMLElement)) {
            return false;
        }
        const panelRect = panel.getBoundingClientRect();
        if (panelRect.width <= 0 || panelRect.height <= 0) {
            return false;
        }
        const localX = event.clientX - panelRect.left;
        const localY = event.clientY - panelRect.top;
        if (localX < 0 || localY < 0 || localX > panelRect.width || localY > panelRect.height) {
            return false;
        }
        const isInResizePriorityCorner = localX >= (panelRect.width - this.panelResizeCornerPriorityPx)
            && localY >= (panelRect.height - this.panelResizeCornerPriorityPx);
        if (isInResizePriorityCorner) {
            return false;
        }
        const threshold = this.panelBorderDragThresholdPx;
        const isOnBorder = localX <= threshold
            || localY <= threshold
            || localX >= (panelRect.width - threshold)
            || localY >= (panelRect.height - threshold);
        return isOnBorder;
    }
    private startPanelDrag(event: PointerEvent, panel: HTMLElement, dragSurface: HTMLElement): void {
        event.preventDefault();
        dragSurface.setPointerCapture(event.pointerId);
        panel.style.zIndex = String(this.nextPanelZIndex++);
        panel.classList.add('panel-dragging');
        const startX = event.clientX;
        const startY = event.clientY;
        const initialOffsetX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
        const initialOffsetY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;
        const onPointerMove = (moveEvent: PointerEvent): void => {
            const nextOffsetX = initialOffsetX + (moveEvent.clientX - startX);
            const nextOffsetY = initialOffsetY + (moveEvent.clientY - startY);
            this.applyPanelOffset(panel, nextOffsetX, nextOffsetY);
            this.keepPanelReachableInViewport(panel);
            this.persistCurrentContextLayout();
        };
        const stopDrag = (): void => {
            panel.classList.remove('panel-dragging');
            dragSurface.removeEventListener('pointermove', onPointerMove);
            dragSurface.removeEventListener('pointerup', stopDrag);
            dragSurface.removeEventListener('pointercancel', stopDrag);
        };
        dragSurface.addEventListener('pointermove', onPointerMove);
        dragSurface.addEventListener('pointerup', stopDrag);
        dragSurface.addEventListener('pointercancel', stopDrag);
    }
    private bindPanelSpawnPositioning(panel: HTMLElement, panelIndex: number): void {
        const placePanelAtSpawn = (): void => {
            if (panel.classList.contains('hidden') || panel.dataset.spawnPositioned === 'true') {
                return;
            }
            const panelRect = panel.getBoundingClientRect();
            if (panelRect.width <= 0 || panelRect.height <= 0) {
                return;
            }
            const targetX = this.panelSpawnOrigin.x;
            const targetY = this.panelSpawnOrigin.y + (panelIndex * this.panelSpawnStepY);
            const nextOffsetX = targetX - panelRect.left;
            const nextOffsetY = targetY - panelRect.top;
            panel.dataset.offsetX = String(nextOffsetX);
            panel.dataset.offsetY = String(nextOffsetY);
            panel.dataset.spawnPositioned = 'true';
            panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
            panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
            this.ensurePanelDragHandleIsReachable(panel);
        };
        const scheduleSpawnPlacement = (): void => {
            requestAnimationFrame(() => placePanelAtSpawn());
        };
        scheduleSpawnPlacement();
        const visibilityObserver = new MutationObserver(() => scheduleSpawnPlacement());
        visibilityObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
    }
    private handlePanelToggle(panel: HudPanelToggle): void {
        this.callbacks.onTogglePanel(panel);
        const panelElement = this.getPanelElement(panel);
        if (panelElement && !panelElement.classList.contains('hidden')) {
            requestAnimationFrame(() => this.ensurePanelDragHandleIsReachable(panelElement));
        }
        this.setHudMenuOpen(false);
        this.persistCurrentContextLayout();
    }
    private setHudMenuOpen(isOpen: boolean): void {
        this.hudElements.hudMenuPanel.classList.toggle('hidden', !isOpen);
        this.hudElements.hudMenuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    private bindPanelPersistenceObserver(panel: HTMLElement): void {
        const observer = new MutationObserver(() => this.persistCurrentContextLayout());
        observer.observe(panel, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    private bindLayoutContextListener(): void {
        const modeIndicator = this.hudElements.modeIndicator;
        const observer = new MutationObserver(() => this.handleLayoutContextChange());
        observer.observe(modeIndicator, { childList: true, characterData: true, subtree: true });
    }
    private handleLayoutContextChange(): void {
        const modeText = this.hudElements.modeIndicator.textContent?.trim() ?? '';
        const nextContext = this.getLayoutContextFromModeIndicator();
        if (nextContext === this.activeLayoutContext) {
            this.enforceVillagePanelVisibility(modeText);
            this.enforceSelectedPanelVisibility(modeText);
            this.enforceCombatPanelVisibility(nextContext);
            return;
        }
        this.persistCurrentContextLayout();
        this.activeLayoutContext = nextContext;
        this.restoreLayoutForCurrentContext();
        this.enforceVillagePanelVisibility(modeText);
        this.enforceSelectedPanelVisibility(modeText);
        this.enforceCombatPanelVisibility(nextContext);
    }
    private getLayoutContextFromModeIndicator(): LayoutContext {
        const modeText = this.hudElements.modeIndicator.textContent?.trim() ?? '';
        if (modeText === GameUiHudPanelController.MODE_TEXT.battle) {
            return 'battle';
        }
        if (modeText === GameUiHudPanelController.MODE_TEXT.world || modeText === GameUiHudPanelController.MODE_TEXT.village) {
            return 'world';
        }
        return 'world';
    }
    private restoreLayoutForCurrentContext(): void {
        const storedLayout = this.getStoredLayout(this.activeLayoutContext);
        const panelConfigs = this.getPanelConfigs();
        if (!storedLayout) {
            panelConfigs.forEach(({ element }, panelIndex) => this.resetPanelToSpawn(element, panelIndex));
            return;
        }
        panelConfigs.forEach(({ key, element, persistenceKey }, panelIndex) => {
            const layoutKey = key ?? persistenceKey;
            if (!layoutKey) {
                this.resetPanelToSpawn(element, panelIndex);
                return;
            }
            const snapshot = storedLayout[layoutKey];
            if (!snapshot) {
                this.resetPanelToSpawn(element, panelIndex);
                return;
            }
            const shouldForceVillageVisibility = this.shouldForceVillagePanelsVisible() && this.isVillagePanel(layoutKey);
            const shouldForceVillageHidden = this.shouldForceVillagePanelsHidden() && this.isVillagePanel(layoutKey);
            const shouldForceSelectedHidden = this.shouldForceSelectedPanelHidden() && this.isSelectedPanel(layoutKey);
            element.dataset.offsetX = String(snapshot.offsetX);
            element.dataset.offsetY = String(snapshot.offsetY);
            element.dataset.spawnPositioned = 'true';
            element.style.setProperty('--panel-offset-x', `${snapshot.offsetX}px`);
            element.style.setProperty('--panel-offset-y', `${snapshot.offsetY}px`);
            element.style.width = snapshot.width ?? '';
            element.style.height = snapshot.height ?? '';
            if (snapshot.zIndex !== null) {
                element.style.zIndex = String(snapshot.zIndex);
            } else {
                element.style.removeProperty('z-index');
            }
            const shouldHide = shouldForceVillageVisibility
                ? false
                : shouldForceVillageHidden
                    ? true
                    : shouldForceSelectedHidden
                        ? true
                        : snapshot.hidden;
            element.classList.toggle('hidden', shouldHide);
            if (!element.classList.contains('hidden')) {
                this.keepPanelReachableInViewport(element);
                requestAnimationFrame(() => this.ensurePanelDragHandleIsReachable(element));
            }
        });
        this.enforceVillagePanelVisibility(this.hudElements.modeIndicator.textContent?.trim() ?? '');
        this.enforceSelectedPanelVisibility(this.hudElements.modeIndicator.textContent?.trim() ?? '');
        this.enforceCombatPanelVisibility(this.activeLayoutContext);
    }
    private resetPanelToSpawn(panel: HTMLElement, panelIndex: number): void {
        panel.dataset.offsetX = '0';
        panel.dataset.offsetY = '0';
        panel.dataset.spawnPositioned = 'false';
        panel.style.setProperty('--panel-offset-x', '0px');
        panel.style.setProperty('--panel-offset-y', '0px');
        panel.style.removeProperty('z-index');
        panel.style.width = '';
        panel.style.height = '';
        requestAnimationFrame(() => {
            if (panel.classList.contains('hidden')) {
                return;
            }
            const panelRect = panel.getBoundingClientRect();
            if (panelRect.width <= 0 || panelRect.height <= 0) {
                return;
            }
            const targetX = this.panelSpawnOrigin.x;
            const targetY = this.panelSpawnOrigin.y + (panelIndex * this.panelSpawnStepY);
            const nextOffsetX = targetX - panelRect.left;
            const nextOffsetY = targetY - panelRect.top;
            panel.dataset.offsetX = String(nextOffsetX);
            panel.dataset.offsetY = String(nextOffsetY);
            panel.dataset.spawnPositioned = 'true';
            panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
            panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
            this.keepPanelReachableInViewport(panel);
            this.ensurePanelDragHandleIsReachable(panel);
        });
    }
    private getPanelElement = (panel: HudPanelToggle): HTMLElement | null => this.getPanelConfigs().find((config) => config.key === panel)?.element ?? null;
    private ensurePanelDragHandleIsReachable(panel: HTMLElement): void {
        if (panel.classList.contains('hidden')) {
            return;
        }
        const dragHandle = panel.querySelector<HTMLElement>('.panel-drag-handle');
        if (!dragHandle) {
            return;
        }
        const menuToggleRect = this.hudElements.hudMenuToggleBtn.getBoundingClientRect();
        const dragHandleRect = dragHandle.getBoundingClientRect();
        if (menuToggleRect.width <= 0 || menuToggleRect.height <= 0 || dragHandleRect.width <= 0 || dragHandleRect.height <= 0) {
            return;
        }
        if (!this.rectanglesOverlap(dragHandleRect, menuToggleRect)) {
            return;
        }
        const clearancePx = 12;
        const horizontalShift = (menuToggleRect.right + clearancePx) - dragHandleRect.left;
        const verticalShift = (menuToggleRect.bottom + clearancePx) - dragHandleRect.top;
        this.applyPanelNudge(panel, horizontalShift, verticalShift);
    }
    private rectanglesOverlap = (firstRect: DOMRect, secondRect: DOMRect): boolean => !(
        firstRect.right < secondRect.left
        || firstRect.left > secondRect.right
        || firstRect.bottom < secondRect.top
        || firstRect.top > secondRect.bottom
    );
    private applyPanelNudge(panel: HTMLElement, horizontalShift: number, verticalShift: number): void {
        const shouldShiftHorizontally = horizontalShift <= verticalShift;
        const currentOffsetX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
        const currentOffsetY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;
        const nextOffsetX = shouldShiftHorizontally ? (currentOffsetX + horizontalShift) : currentOffsetX;
        const nextOffsetY = shouldShiftHorizontally ? currentOffsetY : (currentOffsetY + verticalShift);
        this.applyPanelOffset(panel, nextOffsetX, nextOffsetY);
    }
    private applyPanelOffset(panel: HTMLElement, nextOffsetX: number, nextOffsetY: number): void {
        panel.dataset.offsetX = String(nextOffsetX);
        panel.dataset.offsetY = String(nextOffsetY);
        panel.dataset.spawnPositioned = 'true';
        panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
        panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
    }
    private keepPanelReachableInViewport(panel: HTMLElement): void {
        if (panel.classList.contains('hidden')) {
            return;
        }
        const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
        if (viewportWidth <= 0 || viewportHeight <= 0) {
            return;
        }
        const panelRect = panel.getBoundingClientRect();
        if (panelRect.width <= 0 || panelRect.height <= 0) {
            return;
        }
        const minVisibleWidth = Math.min(panelRect.width, 72);
        const minVisibleHeight = Math.min(panelRect.height, 56);
        let horizontalShift = 0;
        let verticalShift = 0;
        if (panelRect.right < minVisibleWidth) {
            horizontalShift = minVisibleWidth - panelRect.right;
        } else if (panelRect.left > viewportWidth - minVisibleWidth) {
            horizontalShift = (viewportWidth - minVisibleWidth) - panelRect.left;
        }
        if (panelRect.bottom < minVisibleHeight) {
            verticalShift = minVisibleHeight - panelRect.bottom;
        } else if (panelRect.top > viewportHeight - minVisibleHeight) {
            verticalShift = (viewportHeight - minVisibleHeight) - panelRect.top;
        }
        if (horizontalShift === 0 && verticalShift === 0) {
            return;
        }
        const currentOffsetX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
        const currentOffsetY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;
        this.applyPanelOffset(panel, currentOffsetX + horizontalShift, currentOffsetY + verticalShift);
    }
    private persistCurrentContextLayout(): void {
        if (!window.localStorage) {
            return;
        }
        this.enforceCombatPanelVisibility(this.activeLayoutContext);
        const layout: StoredPanelLayout = {};
        this.getPanelConfigs().forEach(({ key, element, persistenceKey }) => {
            const layoutKey = key ?? persistenceKey;
            if (!layoutKey) {
                return;
            }
            const offsetX = Number.parseFloat(element.dataset.offsetX ?? '0') || 0;
            const offsetY = Number.parseFloat(element.dataset.offsetY ?? '0') || 0;
            const zIndex = Number.parseInt(element.style.zIndex || '', 10);
            const isCombatPanel = layoutKey === GameUiHudPanelController.COMBAT_PANEL_PERSISTENCE_KEY;
            const isForcedVillagePanel = this.shouldForceVillagePanelsVisible() && this.isVillagePanel(layoutKey);
            const isForcedHiddenVillagePanel = this.shouldForceVillagePanelsHidden() && this.isVillagePanel(layoutKey);
            const isForcedSelectedPanel = this.shouldForceSelectedPanelHidden() && this.isSelectedPanel(layoutKey);
            let hidden = element.classList.contains('hidden');
            if (isCombatPanel) {
                hidden = this.activeLayoutContext !== 'battle';
            } else if (isForcedVillagePanel) {
                hidden = false;
            } else if (isForcedHiddenVillagePanel) {
                hidden = true;
            } else if (isForcedSelectedPanel) {
                hidden = this.selectedPanelHiddenBeforeVillage ?? element.classList.contains('hidden');
            }
            layout[layoutKey] = {
                offsetX,
                offsetY,
                width: element.style.width || null,
                height: element.style.height || null,
                hidden,
                zIndex: Number.isFinite(zIndex) ? zIndex : null,
            };
        });
        window.localStorage.setItem(this.getStorageKey(this.activeLayoutContext), JSON.stringify(layout));
    }
    private enforceCombatPanelVisibility(context: LayoutContext): void {
        const combatPanel = this.getPanelConfigs()
            .find(({ persistenceKey }) => persistenceKey === GameUiHudPanelController.COMBAT_PANEL_PERSISTENCE_KEY)
            ?.element;
        if (!combatPanel) {
            return;
        }
        const shouldBeVisible = context === 'battle';
        combatPanel.classList.toggle('hidden', !shouldBeVisible);
    }
    private getStoredLayout(context: LayoutContext): StoredPanelLayout | null {
        if (!window.localStorage) {
            return null;
        }
        const raw = window.localStorage.getItem(this.getStorageKey(context));
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw) as StoredPanelLayout;
        } catch {
            return null;
        }
    }
    private getStorageKey(context: LayoutContext): string {
        return context === 'battle'
            ? GameUiHudPanelController.BATTLE_LAYOUT_STORAGE_KEY
            : GameUiHudPanelController.WORLD_LAYOUT_STORAGE_KEY;
    }

    private isSelectedPanel(layoutKey: string): boolean {
        return layoutKey === 'selected';
    }
    private shouldForceSelectedPanelHidden(): boolean {
        return (this.hudElements.modeIndicator.textContent?.trim() ?? '') === GameUiHudPanelController.MODE_TEXT.village;
    }
    private enforceSelectedPanelVisibility(modeText: string): void {
        if (modeText === GameUiHudPanelController.MODE_TEXT.village) {
            if (this.selectedPanelHiddenBeforeVillage === null) {
                this.selectedPanelHiddenBeforeVillage = this.hudElements.selectedPanel.classList.contains('hidden');
            }
            this.hudElements.selectedPanel.classList.add('hidden');
            this.hudElements.toggleSelectedPanelBtn.classList.remove('active');
            return;
        }
        if (this.selectedPanelHiddenBeforeVillage === null) {
            return;
        }
        this.hudElements.selectedPanel.classList.toggle('hidden', this.selectedPanelHiddenBeforeVillage);
        this.hudElements.toggleSelectedPanelBtn.classList.toggle('active', !this.selectedPanelHiddenBeforeVillage);
        this.selectedPanelHiddenBeforeVillage = null;
    }
    private isVillagePanel(layoutKey: string): boolean {
        return layoutKey === GameUiHudPanelController.VILLAGE_ACTIONS_PANEL_PERSISTENCE_KEY
            || layoutKey === GameUiHudPanelController.VILLAGE_RUMORS_PANEL_PERSISTENCE_KEY;
    }
    private shouldForceVillagePanelsVisible(): boolean {
        return (this.hudElements.modeIndicator.textContent?.trim() ?? '') === GameUiHudPanelController.MODE_TEXT.village;
    }
    private shouldForceVillagePanelsHidden(): boolean {
        return !this.shouldForceVillagePanelsVisible();
    }
    private enforceVillagePanelVisibility(modeText: string): void {
        this.getPanelConfigs().forEach(({ element, persistenceKey }) => {
            if (!persistenceKey || !this.isVillagePanel(persistenceKey)) {
                return;
            }
            if (modeText !== GameUiHudPanelController.MODE_TEXT.village) {
                element.classList.add('hidden');
                return;
            }
            element.classList.remove('hidden');
            this.keepPanelReachableInViewport(element);
            requestAnimationFrame(() => this.ensurePanelDragHandleIsReachable(element));
        });
    }
}
