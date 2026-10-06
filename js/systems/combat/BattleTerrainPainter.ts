import { GridCell, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import { BattleMapPainterUtils } from './map/BattleMapPainterUtils.js';

export type TerrainPalette = {
    base: string;
    shade: string;
    detail: string;
};

export class BattleTerrainPainter {
    public drawTerrainSet(ctx: CanvasRenderingContext2D, cell: GridCell, terrainType: TerrainType, detail: string, col: number, row: number): void {
        ctx.strokeStyle = detail;
        ctx.fillStyle = detail;
        ctx.lineWidth = 1;
        if (terrainType === 'forest') {
            this.drawForestDetail(ctx, cell);
            return;
        }
        if (terrainType === 'mountain') {
            this.drawMountainDetail(ctx, cell);
            return;
        }
        if (terrainType === 'water') {
            this.drawWaterDetail(ctx, cell);
            return;
        }
        if (terrainType === 'desert') {
            this.drawDesertDetail(ctx, cell);
            return;
        }
        this.drawGrassDetail(ctx, cell, col, row);
    }

    public getTerrainPalette(terrainType: TerrainType, lightVariant: boolean): TerrainPalette {
        if (terrainType === 'forest') {
            return lightVariant
                ? this.makePalette(theme.worldMap.terrain.forest, theme.ui.panelHighlight, 0.14, theme.ui.primaryAccent, 0.12, theme.ui.panelHighlight, 0.16)
                : this.makePalette(theme.worldMap.terrain.forest, theme.ui.primaryAccent, 0.08, theme.ui.primaryAccent, 0.18, theme.ui.panelHighlight, 0.12);
        }
        if (terrainType === 'mountain') {
            return lightVariant
                ? this.makePalette(theme.worldMap.terrain.mountain, theme.ui.panelHighlight, 0.18, theme.ui.primaryAccent, 0.16, theme.ui.primaryAccent, 0.18)
                : this.makePalette(theme.worldMap.terrain.mountain, theme.ui.primaryAccent, 0.08, theme.ui.primaryAccent, 0.24, theme.ui.panelHighlight, 0.12);
        }
        if (terrainType === 'water') {
            return lightVariant
                ? this.makePalette(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.22, theme.ui.primaryAccent, 0.1, theme.ui.panelHighlight, 0.2)
                : this.makePalette(theme.worldMap.terrain.water, theme.ui.primaryAccent, 0.02, theme.ui.primaryAccent, 0.16, theme.ui.panelHighlight, 0.16);
        }
        if (terrainType === 'desert') {
            return lightVariant
                ? this.makePalette(theme.worldMap.terrain.desert, theme.ui.panelHighlight, 0.15, theme.ui.secondaryAccent, 0.1, theme.ui.primaryAccent, 0.12)
                : this.makePalette(theme.worldMap.terrain.desert, theme.ui.secondaryAccent, 0.04, theme.ui.primaryAccent, 0.12, theme.ui.primaryAccent, 0.1);
        }
        return lightVariant
            ? this.makePalette(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.14, theme.ui.primaryAccent, 0.08, theme.ui.panelHighlight, 0.13)
            : this.makePalette(theme.worldMap.terrain.grass, theme.ui.primaryAccent, 0.05, theme.ui.primaryAccent, 0.12, theme.ui.primaryAccent, 0.1);
    }

    public getObstacleAccent(terrainType: TerrainType): string {
        if (terrainType === 'forest') {
            return BattleMapPainterUtils.mixColors(theme.worldMap.terrain.forest, theme.ui.panelHighlight, 0.16);
        }
        if (terrainType === 'mountain') {
            return BattleMapPainterUtils.mixColors(theme.worldMap.terrain.mountain, theme.ui.panelHighlight, 0.18);
        }
        if (terrainType === 'water') {
            return BattleMapPainterUtils.mixColors(theme.worldMap.terrain.water, theme.ui.secondaryAccent, 0.25);
        }
        if (terrainType === 'desert') {
            return BattleMapPainterUtils.mixColors(theme.worldMap.terrain.desert, theme.ui.secondaryAccent, 0.2);
        }
        return BattleMapPainterUtils.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.14);
    }

    private drawForestDetail(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        for (let index = 0; index < 3; index++) {
            const x = cell.x + 7 + (index * (cell.width / 4));
            const y = cell.y + (index % 2 === 0 ? cell.height * 0.35 : cell.height * 0.58);
            ctx.beginPath();
            ctx.arc(x, y, 2.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawMountainDetail(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        ctx.beginPath();
        ctx.moveTo(cell.x + 6, cell.y + cell.height - 6);
        ctx.lineTo(cell.x + (cell.width * 0.35), cell.y + 7);
        ctx.lineTo(cell.x + (cell.width * 0.58), cell.y + cell.height - 10);
        ctx.moveTo(cell.x + (cell.width * 0.45), cell.y + cell.height - 8);
        ctx.lineTo(cell.x + (cell.width * 0.72), cell.y + 10);
        ctx.lineTo(cell.x + cell.width - 6, cell.y + cell.height - 8);
        ctx.stroke();
    }

    private drawWaterDetail(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        for (let band = 0; band < 3; band++) {
            const y = cell.y + (cell.height * (0.26 + (band * 0.22)));
            ctx.beginPath();
            ctx.moveTo(cell.x + 4, y);
            ctx.quadraticCurveTo(cell.x + (cell.width * 0.3), y - 3, cell.x + (cell.width * 0.6), y + 1);
            ctx.quadraticCurveTo(cell.x + (cell.width * 0.82), y + 4, cell.x + cell.width - 4, y);
            ctx.stroke();
        }
    }

    private drawDesertDetail(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        for (let dune = 0; dune < 2; dune++) {
            const y = cell.y + (cell.height * (0.42 + (dune * 0.18)));
            ctx.beginPath();
            ctx.arc(cell.x + (cell.width * 0.34), y, 7, Math.PI, Math.PI * 2);
            ctx.arc(cell.x + (cell.width * 0.62), y, 6, Math.PI, Math.PI * 2);
            ctx.stroke();
        }
    }

    private drawGrassDetail(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number): void {
        const offset = ((col * 17) + (row * 31)) % 5;
        for (let dot = 0; dot < 4; dot++) {
            ctx.beginPath();
            ctx.arc(cell.x + 8 + (dot * 7), cell.y + 10 + (((dot + offset) % 3) * 6), 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private makePalette = (
        base: string,
        baseMixColor: string,
        baseRatio: number,
        shadeMixColor: string,
        shadeRatio: number,
        detailColor: string,
        detailAlpha: number,
    ): TerrainPalette => ({
        base: BattleMapPainterUtils.mixColors(base, baseMixColor, baseRatio),
        shade: BattleMapPainterUtils.mixColors(base, shadeMixColor, shadeRatio),
        detail: BattleMapPainterUtils.withAlpha(detailColor, detailAlpha),
    });
}
