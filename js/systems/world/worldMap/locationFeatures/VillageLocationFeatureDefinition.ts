import { LocationFeatureDefinition } from './LocationFeatureDefinition.js';

export class VillageLocationFeatureDefinition implements LocationFeatureDefinition {
    public readonly id = 'village' as const;
    public readonly displayName = 'Village';

    public render(
        ctx: CanvasRenderingContext2D,
        renderer: { drawVillage: (ctx: CanvasRenderingContext2D, x: number, y: number, glow: number) => void },
        anchor: { x: number; y: number },
    ): void {
        renderer.drawVillage(ctx, anchor.x, anchor.y, 0.9);
    }
}
