import { theme } from '../../config/ThemeConfig.js';

export default class VillageEnvironmentRenderer {
    public render(ctx: CanvasRenderingContext2D, width: number, height: number, _time: number): void {
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, this.mixColors(theme.worldMap.background, theme.worldMap.terrain.water, 0.25));
        skyGradient.addColorStop(1, this.mixColors(theme.worldMap.terrain.grass, theme.worldMap.terrain.forest, 0.25));
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        const villagePlaneTop = height * 0.22;
        const villagePlaneBottom = height * 0.94;
        const villagePlaneWidth = width * 0.78;
        const centerX = width * 0.5;

        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.grass, theme.worldMap.terrain.forest, 0.4);
        ctx.beginPath();
        ctx.moveTo(centerX, villagePlaneTop);
        ctx.lineTo(centerX + villagePlaneWidth * 0.5, (villagePlaneTop + villagePlaneBottom) * 0.5);
        ctx.lineTo(centerX, villagePlaneBottom);
        ctx.lineTo(centerX - villagePlaneWidth * 0.5, (villagePlaneTop + villagePlaneBottom) * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    private mixColors(colorA: string, colorB: string, ratio: number): string {
        const blend = Math.max(0, Math.min(1, ratio));
        const rA = parseInt(colorA.slice(1, 3), 16);
        const gA = parseInt(colorA.slice(3, 5), 16);
        const bA = parseInt(colorA.slice(5, 7), 16);
        const rB = parseInt(colorB.slice(1, 3), 16);
        const gB = parseInt(colorB.slice(3, 5), 16);
        const bB = parseInt(colorB.slice(5, 7), 16);
        if ([rA, gA, bA, rB, gB, bB].some((value) => Number.isNaN(value))) {
            return colorA;
        }

        const r = Math.round(rA + (rB - rA) * blend);
        const g = Math.round(gA + (gB - gA) * blend);
        const b = Math.round(bA + (bB - bA) * blend);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
