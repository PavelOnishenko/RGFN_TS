/**
 * RGFN-specific wrapper over its stick figure renderer.
 */

import EngineStickFigure from '../rendering/StickFigure.js';
import type { ImportedAnimationMeta, ImportedKeyframe } from '../animations/types.js';
import { theme } from '../config/ThemeConfig.js';

export interface StickFigurePose {
    torsoTopX?: number;
    headY: number;
    headTilt?: number;
    headScale?: number;
    headOffsetY?: number;
    torsoEndY: number;
    leftShoulderX: number;
    leftShoulderY: number;
    leftElbowX: number;
    leftElbowY: number;
    leftHandX: number;
    leftHandY: number;
    rightShoulderX: number;
    rightShoulderY: number;
    rightElbowX: number;
    rightElbowY: number;
    rightHandX: number;
    rightHandY: number;
    leftHipX: number;
    leftHipY: number;
    leftKneeX: number;
    leftKneeY: number;
    leftFootX: number;
    leftFootY: number;
    rightHipX: number;
    rightHipY: number;
    rightKneeX: number;
    rightKneeY: number;
    rightFootX: number;
    rightFootY: number;
}

export default class StickFigure {
    private static readonly LIMB_LINE_WIDTH = 2.2;
    private static readonly CORE_BONE_LINE_WIDTH = 2.4;
    private static readonly OUTLINE_WIDTH = 1.1;

    public static draw(ctx: CanvasRenderingContext2D, x: number, y: number, pose: StickFigurePose, color: string, facingRight: boolean, scale: number = 1): void {
        EngineStickFigure.draw(ctx, x, y, pose, color, facingRight, scale, {
            limbLineWidth: this.LIMB_LINE_WIDTH,
            coreBoneLineWidth: this.CORE_BONE_LINE_WIDTH,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: theme.ui.primaryBg
        });
    }

    public static readonly getPoseFromImportedAnimation = (
        keyframes: ImportedKeyframe[],
        meta: ImportedAnimationMeta,
        progress: number
    ): StickFigurePose => EngineStickFigure.getPoseFromImportedAnimation(keyframes, meta, progress) as StickFigurePose;
}
