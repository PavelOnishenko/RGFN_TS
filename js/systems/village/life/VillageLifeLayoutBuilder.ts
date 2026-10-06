import { theme } from '../../../config/ThemeConfig.js';
import { VillageSpot } from '../VillagePopulation.js';
import { IsoPoint, VillageHouse, VillageHouseConfig } from './VillageLifeTypes.js';

export default class VillageLifeLayoutBuilder {
    private readonly mixColors: (a: string, b: string, ratio: number) => string;

    constructor(mixColors: (a: string, b: string, ratio: number) => string) {
        this.mixColors = mixColors;
    }

    public buildHouses = (): VillageHouse[] => {
        const roof = this.getRoofVariants();
        const houses: VillageHouseConfig[] = [
            { gridX: -4.2, gridY: -0.4, footprintWidth: 1.6, footprintDepth: 1.6, wallHeight: 1.2, roofHeight: 0.8, roofColor: roof[0] },
            { gridX: -1.6, gridY: -1.8, footprintWidth: 1.8, footprintDepth: 1.6, wallHeight: 1.28, roofHeight: 0.85, roofColor: roof[1] },
            { gridX: 1.8, gridY: -0.6, footprintWidth: 1.9, footprintDepth: 1.8, wallHeight: 1.35, roofHeight: 0.9, roofColor: roof[2], isShop: true },
            { gridX: -4.4, gridY: 2.1, footprintWidth: 1.7, footprintDepth: 1.7, wallHeight: 1.18, roofHeight: 0.82, roofColor: roof[3] },
            { gridX: -0.9, gridY: 2.8, footprintWidth: 1.65, footprintDepth: 1.65, wallHeight: 1.12, roofHeight: 0.78, roofColor: roof[4] },
            { gridX: 2.5, gridY: 2.5, footprintWidth: 1.75, footprintDepth: 1.6, wallHeight: 1.18, roofHeight: 0.82, roofColor: this.mixColors(roof[1], roof[3], 0.36) },
        ];

        return houses
            .map((house) => this.createVillageHouse(house))
            .sort((a, b) => (a.worldX + a.worldY) - (b.worldX + b.worldY));
    };

    public buildVillageSpots = (houses: VillageHouse[], projectIso: (x: number, y: number, z: number) => IsoPoint): VillageSpot[] => {
        const spots: VillageSpot[] = [];
        houses.forEach((house, houseIndex) => {
            const frontDoor = projectIso(house.worldX + (house.footprintWidth * 0.5), house.worldY + house.footprintDepth + 0.26, 0);
            const nearDoor = projectIso(house.worldX + (house.footprintWidth * 0.5), house.worldY + house.footprintDepth + 0.9, 0);
            spots.push({ x: frontDoor.x, y: frontDoor.y, houseIndex });
            spots.push({ x: nearDoor.x, y: nearDoor.y });
        });
        [projectIso(-1.1, 1.1, 0), projectIso(0.4, 0.6, 0), projectIso(1.2, 2.1, 0), projectIso(-2.1, 2.0, 0)]
            .forEach((spot) => spots.push({ x: spot.x, y: spot.y }));
        return spots;
    };

    private getRoofVariants = (): string[] => [
        theme.ui.secondaryAccent,
        this.mixColors(theme.ui.secondaryAccent, theme.ui.primaryAccent, 0.2),
        this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.desert, 0.28),
        this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.3),
        this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.mountain, 0.2),
    ];

    private createVillageHouse = (config: VillageHouseConfig): VillageHouse => ({
        worldX: config.gridX,
        worldY: config.gridY,
        footprintWidth: config.footprintWidth,
        footprintDepth: config.footprintDepth,
        wallHeight: config.wallHeight,
        roofHeight: config.roofHeight,
        roofColor: config.isShop ? this.mixColors(config.roofColor, theme.ui.primaryAccent, 0.2) : config.roofColor,
        doorOpenAmount: 0,
        doorTargetOpenAmount: 0,
        doorStateUntil: 0,
        isShop: Boolean(config.isShop),
    });
}
