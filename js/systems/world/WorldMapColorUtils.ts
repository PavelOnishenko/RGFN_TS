export default class WorldMapColorUtils {
    public adjustColorBrightness(color: string, brightness: number): string {
        const hex = color.replace('#', '');
        const red = Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) * brightness));
        const green = Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) * brightness));
        const blue = Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) * brightness));
        const redHex = red.toString(16).padStart(2, '0');
        const greenHex = green.toString(16).padStart(2, '0');
        const blueHex = blue.toString(16).padStart(2, '0');
        return `#${redHex}${greenHex}${blueHex}`;
    }

    public withAlpha(hexColor: string, alpha: number): string {
        if (hexColor.startsWith('rgba')) {
            return hexColor.replace(/rgba\(([^)]+),\s*[^)]+\)/, (_match, channels) => `rgba(${channels}, ${alpha})`);
        }

        if (hexColor.startsWith('rgb')) {
            const matches = hexColor.match(/\d+/g) ?? ['0', '0', '0'];
            const [r, g, b] = matches;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    public mixColors(colorA: string, colorB: string, ratio: number): string {
        const a = this.parseColor(colorA);
        const b = this.parseColor(colorB);
        const t = Math.max(0, Math.min(1, ratio));
        const r = Math.round((a.r * (1 - t)) + (b.r * t));
        const g = Math.round((a.g * (1 - t)) + (b.g * t));
        const blue = Math.round((a.b * (1 - t)) + (b.b * t));
        return `rgb(${r}, ${g}, ${blue})`;
    }

    public seededRandom(seed: number): number {
        const value = Math.sin(seed * 0.001 + 1.123) * 43758.5453;
        return value - Math.floor(value);
    }

    private parseColor(color: string): { r: number; g: number; b: number } {
        if (color.startsWith('rgb')) {
            const [r = '0', g = '0', b = '0'] = color.match(/\d+/g) ?? [];
            return { r: Number(r), g: Number(g), b: Number(b) };
        }

        const hex = color.replace('#', '');
        return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
    }
}
