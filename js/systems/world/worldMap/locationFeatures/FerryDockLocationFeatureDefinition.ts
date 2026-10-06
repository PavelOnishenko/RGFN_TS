import { LocationFeatureDefinition } from './LocationFeatureDefinition.js';

export class FerryDockLocationFeatureDefinition implements LocationFeatureDefinition {
    public readonly id = 'ferry-dock' as const;
    public readonly displayName = 'Ferry Dock';

    public render(
        ctx: CanvasRenderingContext2D,
        renderer: { drawFerryDock: (ctx: CanvasRenderingContext2D, x: number, y: number, glow: number) => void },
        anchor: { x: number; y: number },
    ): void {
        renderer.drawFerryDock(ctx, anchor.x, anchor.y, 0.9);
    }
}
