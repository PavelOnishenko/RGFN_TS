/**
 * Theme Configuration for RGFN Game
 * Fixed color palette - no theme switching
 */

import { Theme } from './Theme';

// Fixed game theme (light parchment fantasy aesthetic)
const GAME_THEME: Theme = {
    name: 'Royal Scroll',
    ui: {
        primaryBg: '#e8d7b3',
        secondaryBg: '#d5be93',
        canvasBg: '#ccaf80',
        primaryAccent: '#2e2013',
        secondaryAccent: '#8f5a2a',
        enemyColor: '#8f1f1f',
        warningColor: '#b75a1d',
        disabledColor: '#8d8069',
        systemMessageColor: '#3f2e1d',
        textPrimary: '#1f1207',
        textMuted: '#5b4630',
        panelShadow: '#947145',
        panelHighlight: '#f2e5c9',
        locationNameColor: '#355d8c',
        itemNameColor: '#7b4a24',
        personNameColor: '#6f2f75',
    },
    entities: {
        player: { body: '#2f5ea8', face: '#f2debc', healthBg: '#604429', healthHigh: '#2f7f2f', healthMid: '#b78532', healthLow: '#8f1f1f' },
        skeleton: { body: '#d8ccbc', features: '#332318', healthBg: '#4f3924', healthBar: '#8f1f1f' },
    },
    worldMap: {
        background: '#c9ab7f',
        terrain: { grass: '#8da75d', forest: '#577235', mountain: '#948068', water: '#5f8ba8', desert: '#d4b17a' },
        unknown: '#a18a67',
        gridLines: 'rgba(46, 32, 19, 0)',
        playerMarker: '#8f1f1f',
        iconScale: { character: 1, village: 0.5 },
        questionMarkOffset: { x: 0, y: 0 },
        gridOffset: { x: 0, y: 0 },
        gridDimensions: { columns: 100, rows: 100 },
        viewportSize: { width: 720, height: 720 },
        cellSize: { default: 28, min: 8, max: 64, zoomStep: 4, panStepCells: 4 },
        cellTravelMinutes: 12,
        cellCornerRadius: 10,
        connectorRadius: 16,
    },
    battleMap: {
        background: '#ceb287',
        tileDark: 'rgba(159, 124, 78, 0.48)',
        tileLight: 'rgba(201, 167, 115, 0.52)',
        currentEntityPlayer: 'rgba(47, 94, 168, 0.3)',
        currentEntityEnemy: 'rgba(143, 31, 31, 0.28)',
        selectedEnemy: 'rgba(183, 90, 29, 0.23)',
        gridBorders: 'rgba(95, 64, 35, 0.3)',
        obstacleFill: '#71553a',
        obstacleEdge: '#2e2013',
        obstacleShadow: 'rgba(46, 32, 19, 0.22)',
        gridSize: { columns: 10, rows: 8 },
    },
    quest: {
        feedbackMessageDurationMs: 5000,
        nameGeneration: {
            maxWordsByDomain: { location: 4, artifact: 4, character: 4, monster: 4, mainQuest: 4 },
            wordLengthWeightsByDomain: {
                location: { 1: 52, 2: 40, 3: 7, 4: 1 },
                artifact: { 1: 50, 2: 42, 3: 7, 4: 1 },
                character: { 1: 58, 2: 36, 3: 5, 4: 1 },
                monster: { 1: 54, 2: 38, 3: 7, 4: 1 },
                mainQuest: { 1: 48, 2: 42, 3: 9, 4: 1 },
            },
        },
    },
};

// Export the fixed theme
export const theme = GAME_THEME;

function applyCssProperties(root: HTMLElement, properties: Record<string, string>): void {
    Object.entries(properties).forEach(([property, value]) => root.style.setProperty(property, value));
}

const THEME_CSS_PROPERTIES: Record<string, string> = {
    '--color-primary-bg': theme.ui.primaryBg,
    '--color-secondary-bg': theme.ui.secondaryBg,
    '--color-canvas-bg': theme.ui.canvasBg,
    '--color-primary-accent': theme.ui.primaryAccent,
    '--color-secondary-accent': theme.ui.secondaryAccent,
    '--color-enemy': theme.ui.enemyColor,
    '--color-warning': theme.ui.warningColor,
    '--color-disabled': theme.ui.disabledColor,
    '--color-system-message': theme.ui.systemMessageColor,
    '--color-text-primary': theme.ui.textPrimary,
    '--color-text-muted': theme.ui.textMuted,
    '--color-panel-shadow': theme.ui.panelShadow,
    '--color-panel-highlight': theme.ui.panelHighlight,
    '--color-location-name': theme.ui.locationNameColor,
    '--color-item-name': theme.ui.itemNameColor,
    '--color-person-name': theme.ui.personNameColor,
    '--world-map-width': `${theme.worldMap.viewportSize.width}px`,
    '--world-map-height': `${theme.worldMap.viewportSize.height}px`,
};

/**
 * Apply theme colors to CSS custom properties
 * Call this once on game initialization
 */
export function applyThemeToCSS(): void {
    const root = document.documentElement;
    applyCssProperties(root, THEME_CSS_PROPERTIES);
}
