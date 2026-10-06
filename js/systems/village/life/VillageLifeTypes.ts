export type VillageHouse = {
    worldX: number;
    worldY: number;
    footprintWidth: number;
    footprintDepth: number;
    wallHeight: number;
    roofHeight: number;
    roofColor: string;
    doorOpenAmount: number;
    doorTargetOpenAmount: number;
    doorStateUntil: number;
    isShop: boolean;
};

export type VillageHouseConfig = {
    gridX: number;
    gridY: number;
    footprintWidth: number;
    footprintDepth: number;
    wallHeight: number;
    roofHeight: number;
    roofColor: string;
    isShop?: boolean;
};

export type IsoPoint = { x: number; y: number };
