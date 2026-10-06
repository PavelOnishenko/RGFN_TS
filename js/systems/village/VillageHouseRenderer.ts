import { theme } from '../../config/ThemeConfig.js';
import { IsoPoint, VillageHouse } from './life/VillageLifeTypes.js';

export default class VillageHouseRenderer {
    private static readonly OUTLINE_COLOR = '#1d1b22';

    private readonly mixColors: (a: string, b: string, ratio: number) => string;
    private readonly projectIso: (x: number, y: number, z: number) => IsoPoint;

    constructor(mixColors: (a: string, b: string, ratio: number) => string, projectIso: (x: number, y: number, z: number) => IsoPoint) {
        this.mixColors = mixColors;
        this.projectIso = projectIso;
    }

    public drawVillageHouse(ctx: CanvasRenderingContext2D, house: VillageHouse): void {
        const wallLight = this.mixColors(theme.worldMap.terrain.desert, theme.worldMap.terrain.mountain, 0.24);
        const wallDark = this.mixColors(theme.worldMap.terrain.mountain, theme.worldMap.terrain.forest, 0.5);
        const base = this.getHouseBasePoints(house);
        const top = this.getHouseTopPoints(house);
        const roofPeak = this.projectIso(house.worldX + house.footprintWidth * 0.5, house.worldY + house.footprintDepth * 0.5, house.wallHeight + house.roofHeight);

        ctx.strokeStyle = VillageHouseRenderer.OUTLINE_COLOR;
        ctx.lineWidth = 1.8;

        this.fillPolygon(ctx, [base.d, base.c, top.ct, top.dt], wallLight);
        this.fillPolygon(ctx, [base.b, base.c, top.ct, top.bt], wallDark);
        this.fillPolygon(ctx, [top.at, top.bt, roofPeak], house.roofColor);
        this.fillPolygon(ctx, [top.bt, top.ct, roofPeak], this.mixColors(house.roofColor, theme.worldMap.terrain.mountain, 0.2));
        this.fillPolygon(ctx, [top.ct, top.dt, roofPeak], this.mixColors(house.roofColor, theme.worldMap.terrain.desert, 0.14));
        this.fillPolygon(ctx, [top.dt, top.at, roofPeak], this.mixColors(house.roofColor, theme.worldMap.terrain.forest, 0.24));

        this.drawDoor(ctx, house);
        if (house.isShop) {
            this.drawShopSign(ctx, house);
        }
    }

    private getHouseBasePoints = (house: VillageHouse): { b: IsoPoint; c: IsoPoint; d: IsoPoint } => ({
        b: this.projectIso(house.worldX + house.footprintWidth, house.worldY, 0),
        c: this.projectIso(house.worldX + house.footprintWidth, house.worldY + house.footprintDepth, 0),
        d: this.projectIso(house.worldX, house.worldY + house.footprintDepth, 0),
    });

    private getHouseTopPoints = (house: VillageHouse): { at: IsoPoint; bt: IsoPoint; ct: IsoPoint; dt: IsoPoint } => ({
        at: this.projectIso(house.worldX, house.worldY, house.wallHeight),
        bt: this.projectIso(house.worldX + house.footprintWidth, house.worldY, house.wallHeight),
        ct: this.projectIso(house.worldX + house.footprintWidth, house.worldY + house.footprintDepth, house.wallHeight),
        dt: this.projectIso(house.worldX, house.worldY + house.footprintDepth, house.wallHeight),
    });

    private drawDoor(ctx: CanvasRenderingContext2D, house: VillageHouse): void {
        const doorCenterX = house.worldX + house.footprintWidth * 0.58;
        const doorBottomY = house.worldY + house.footprintDepth;
        const doorHalf = house.footprintWidth * 0.11;
        const doorHeight = house.wallHeight * 0.62;
        const door = {
            leftBottom: this.projectIso(doorCenterX - doorHalf, doorBottomY, 0),
            rightBottom: this.projectIso(doorCenterX + doorHalf, doorBottomY, 0),
            rightTop: this.projectIso(doorCenterX + doorHalf, doorBottomY, doorHeight),
            leftTop: this.projectIso(doorCenterX - doorHalf, doorBottomY, doorHeight),
        };

        this.fillPolygon(
            ctx,
            [door.leftBottom, door.rightBottom, door.rightTop, door.leftTop],
            this.mixColors(theme.ui.primaryBg, theme.worldMap.terrain.mountain, 0.35),
        );

        const hinge = door.leftBottom;
        const openRad = (Math.PI / 2) * house.doorOpenAmount;
        const openX = Math.cos(openRad) * (door.rightBottom.x - door.leftBottom.x);
        const openY = Math.sin(openRad) * (door.rightBottom.x - door.leftBottom.x) * 0.22;
        const openBottom = { x: hinge.x + openX, y: hinge.y + openY };
        const openTop = { x: door.leftTop.x + openX, y: door.leftTop.y + openY };

        this.fillPolygon(ctx, [hinge, openBottom, openTop, door.leftTop], this.mixColors(theme.worldMap.terrain.desert, theme.ui.primaryBg, 0.35));
    }

    private drawShopSign(ctx: CanvasRenderingContext2D, house: VillageHouse): void {
        const signBottomLeft = this.projectIso(house.worldX + house.footprintWidth * 0.36, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.7);
        const signBottomRight = this.projectIso(house.worldX + house.footprintWidth * 0.72, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.7);
        const signTopRight = this.projectIso(house.worldX + house.footprintWidth * 0.72, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.95);
        const signTopLeft = this.projectIso(house.worldX + house.footprintWidth * 0.36, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.95);
        this.fillPolygon(ctx, [signBottomLeft, signBottomRight, signTopRight, signTopLeft], this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryAccent, 0.34));
        ctx.fillStyle = theme.ui.primaryBg;
        ctx.font = 'bold 10px Arial, sans-serif';
        const textAnchor = this.projectIso(house.worldX + house.footprintWidth * 0.44, house.worldY + house.footprintDepth + 0.04, house.wallHeight * 0.88);
        ctx.fillText('SHOP', textAnchor.x, textAnchor.y);
    }

    private fillPolygon(ctx: CanvasRenderingContext2D, points: IsoPoint[], fillStyle: string): void {
        if (points.length < 3) {
            return;
        }

        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}
