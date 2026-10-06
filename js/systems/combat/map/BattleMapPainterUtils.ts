export class BattleMapPainterUtils {
    public static createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): Path2D {
        const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
        const path = new Path2D();
        path.moveTo(x + safeRadius, y);
        path.lineTo(x + width - safeRadius, y);
        path.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        path.lineTo(x + width, y + height - safeRadius);
        path.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        path.lineTo(x + safeRadius, y + height);
        path.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        path.lineTo(x, y + safeRadius);
        path.quadraticCurveTo(x, y, x + safeRadius, y);
        path.closePath();
        return path;
    }

    public static mixColors(colorA: string, colorB: string, ratio: number): string {
        const a = this.parseColor(colorA);
        const b = this.parseColor(colorB);
        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const r = Math.round((a.r * (1 - clampedRatio)) + (b.r * clampedRatio));
        const g = Math.round((a.g * (1 - clampedRatio)) + (b.g * clampedRatio));
        const blue = Math.round((a.b * (1 - clampedRatio)) + (b.b * clampedRatio));
        return `rgb(${r}, ${g}, ${blue})`;
    }

    public static withAlpha(color: string, alpha: number): string {
        const { r, g, b } = this.parseColor(color);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private static parseColor(color: string): { r: number; g: number; b: number } {
        if (color.startsWith('rgb')) {
            const [r = '0', g = '0', b = '0'] = color.match(/\d+/g) ?? [];
            return { r: Number(r), g: Number(g), b: Number(b) };
        }
        const hex = color.replace('#', '');
        return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
    }
}
