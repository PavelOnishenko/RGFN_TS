export type LocationFeatureId = 'village' | 'ferry-dock';

export interface LocationFeatureDefinition {
    readonly id: LocationFeatureId;
    readonly displayName: string;
    render(
        ctx: CanvasRenderingContext2D,
        renderer: {
            drawVillage: (ctx: CanvasRenderingContext2D, x: number, y: number, glow: number) => void;
            drawFerryDock: (ctx: CanvasRenderingContext2D, x: number, y: number, glow: number) => void;
        },
        anchor: { x: number; y: number },
    ): void;
}
