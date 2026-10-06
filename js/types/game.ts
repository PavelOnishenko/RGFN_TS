// Game-specific type definitions for RGFN

export type GameMode = 'WORLD_MAP' | 'BATTLE';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';

export type FogState = 'unknown' | 'discovered' | 'hidden';

export type MapDisplayConfig = {
    everythingDiscovered: boolean;
    fogOfWar: boolean;
};

export type TerrainType = 'grass' | 'forest' | 'mountain' | 'water' | 'desert';

export type TerrainPattern = 'dots' | 'lines' | 'cross' | 'plain' | 'waves' | 'dunes' | 'groves' | 'ridges';

export interface TerrainData {
    type: TerrainType;
    color: string;
    pattern: TerrainPattern;
    elevation: number;
    moisture: number;
    heat: number;
    seed: number;
}

export interface TerrainNeighbors {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
    northEast: boolean;
    northWest: boolean;
    southEast: boolean;
    southWest: boolean;
}

export interface GridCell {
    col: number;
    row: number;
    x: number;
    y: number;
    width: number;
    height: number;
    data: Record<string, any>;
}

export interface GridPosition {
    col: number;
    row: number;
}

export interface SelectedWorldCellInfo {
    mode: 'world';
    col: number;
    row: number;
    terrainType: TerrainType;
    fogState: FogState;
    isVisible: boolean;
    isVillage: boolean;
    villageName: string | null;
    villageStatus: 'current' | 'mapped' | null;
    locationFeatureIds: Array<'village' | 'ferry-dock'>;
    isTraversable: boolean;
}

export interface SelectedBattleCellInfo {
    mode: 'battle';
    col: number;
    row: number;
    terrainType: TerrainType;
    obstacleName: string | null;
    isTraversable: boolean;
    occupantType: 'player' | 'enemy' | null;
    occupantName: string | null;
    occupantHp: number | null;
    occupantMaxHp: number | null;
}

export type SelectedCellInfo = SelectedWorldCellInfo | SelectedBattleCellInfo;

export interface StateMachineCallbacks {
    enter?: (data?: any) => void;
    update?: (deltaTime: number, data?: any) => void;
    exit?: (data?: any) => void;
}

export interface TimingConfig {
    battle: {
        playerActionDelay: number;
        waitActionDelay: number;
        enemyTurnDelay: number;
        enemyActionStartDelay: number;
        fleeFailedDelay: number;
        turnStartInputDelay: number;
        defeatEndDelay: number;
        victoryEndDelay: number;
        fleeSuccessDelay: number;
        gameOverDelay: number;
        battleStartSplashDuration: number;
        battleEndSplashDuration: number;
        itemDiscoverySplashDuration: number;
    };
}

export interface CombatEntity {
    id: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    damage: number;
    active: boolean;
    gridCol?: number;
    gridRow?: number;
    takeDamage(amount: number): boolean | void;
    isDead(): boolean;
}
