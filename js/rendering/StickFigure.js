import { getPoseFromImportedAnimation } from '../animations/importedAnimation.js';

const DEFAULT_STYLE = {
    limbLineWidth: 2,
    coreBoneLineWidth: 2,
    outlineWidth: 0,
    outlineColor: '#000'
};

export default class StickFigure {
    static HEAD_RADIUS = 8;
    static FEET_Y_OFFSET = 25;

    static draw(ctx, x, y, pose, color, facingRight, scale = 1, style = DEFAULT_STYLE) {
        const drawingStyle = {
            ...DEFAULT_STYLE,
            ...(style || {})
        };

        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        const limbLineWidth = drawingStyle.limbLineWidth * scale;
        const coreBoneLineWidth = drawingStyle.coreBoneLineWidth * scale;
        const outlineWidth = drawingStyle.outlineWidth * scale;
        const hasOutline = outlineWidth > 0;
        const outlineColor = drawingStyle.outlineColor;

        ctx.lineWidth = limbLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const flip = facingRight ? 1 : -1;
        const drawY = y - this.FEET_Y_OFFSET * scale;
        const headRadius = this.HEAD_RADIUS * scale * (pose.headScale ?? 1);

        const leftShoulderX = x + pose.leftShoulderX * flip * scale;
        const leftShoulderY = drawY + pose.leftShoulderY * scale;
        const rightShoulderX = x + pose.rightShoulderX * flip * scale;
        const rightShoulderY = drawY + pose.rightShoulderY * scale;

        const leftHipX = x + pose.leftHipX * flip * scale;
        const leftHipY = drawY + pose.leftHipY * scale;
        const rightHipX = x + pose.rightHipX * flip * scale;
        const rightHipY = drawY + pose.rightHipY * scale;

        const shoulderCenterX = (leftShoulderX + rightShoulderX) / 2;
        const shoulderCenterY = (leftShoulderY + rightShoulderY) / 2;
        const hipCenterX = (leftHipX + rightHipX) / 2;
        const hipCenterY = (leftHipY + rightHipY) / 2;

        const torsoTopX = x + (pose.torsoTopX ?? 0) * flip * scale;
        const baseHeadY = drawY + (pose.headY + (pose.headOffsetY ?? 0)) * scale;
        const neckToHeadDistance = Math.max(headRadius, shoulderCenterY - baseHeadY);
        const headTilt = pose.headTilt ?? 0;
        const headX = torsoTopX + Math.sin(headTilt) * neckToHeadDistance * flip;
        const headY = shoulderCenterY - Math.cos(headTilt) * neckToHeadDistance;

        if (hasOutline) {
            ctx.beginPath();
            ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
            ctx.fillStyle = outlineColor;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(headX, headY, Math.max(0, headRadius - outlineWidth), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        const headToShoulderX = shoulderCenterX - headX;
        const headToShoulderY = shoulderCenterY - headY;
        const headToShoulderDistance = Math.hypot(headToShoulderX, headToShoulderY) || 1;
        const headBottomX = headX + (headToShoulderX / headToShoulderDistance) * headRadius;
        const headBottomY = headY + (headToShoulderY / headToShoulderDistance) * headRadius;

        ctx.lineWidth = coreBoneLineWidth;
        this.drawCoreBoneRect(ctx, headBottomX, headBottomY, shoulderCenterX, shoulderCenterY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);
        this.drawCoreBoneRect(ctx, leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);
        this.drawCoreBoneRect(ctx, shoulderCenterX, shoulderCenterY, hipCenterX, hipCenterY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);
        this.drawCoreBoneRect(ctx, leftHipX, leftHipY, rightHipX, rightHipY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);

        ctx.lineWidth = limbLineWidth;
        this.drawLimb(ctx, [
            [leftShoulderX, leftShoulderY],
            [x + pose.leftElbowX * flip * scale, drawY + pose.leftElbowY * scale],
            [x + pose.leftHandX * flip * scale, drawY + pose.leftHandY * scale]
        ], limbLineWidth, color, hasOutline, outlineColor, outlineWidth);

        this.drawLimb(ctx, [
            [rightShoulderX, rightShoulderY],
            [x + pose.rightElbowX * flip * scale, drawY + pose.rightElbowY * scale],
            [x + pose.rightHandX * flip * scale, drawY + pose.rightHandY * scale]
        ], limbLineWidth, color, hasOutline, outlineColor, outlineWidth);

        this.drawLimb(ctx, [
            [leftHipX, leftHipY],
            [x + pose.leftKneeX * flip * scale, drawY + pose.leftKneeY * scale],
            [x + pose.leftFootX * flip * scale, drawY + pose.leftFootY * scale]
        ], limbLineWidth, color, hasOutline, outlineColor, outlineWidth);

        this.drawLimb(ctx, [
            [rightHipX, rightHipY],
            [x + pose.rightKneeX * flip * scale, drawY + pose.rightKneeY * scale],
            [x + pose.rightFootX * flip * scale, drawY + pose.rightFootY * scale]
        ], limbLineWidth, color, hasOutline, outlineColor, outlineWidth);
    }

    static getPoseFromImportedAnimation(keyframes, meta, progress) {
        return getPoseFromImportedAnimation(keyframes, meta, progress);
    }

    static drawLimb(ctx, points, baseWidth, color, hasOutline, outlineColor, outlineWidth) {
        if (points.length < 2) {
            return;
        }

        if (hasOutline) {
            this.strokePolyline(ctx, points, baseWidth + outlineWidth * 2, outlineColor);
        }

        this.strokePolyline(ctx, points, baseWidth, color);
    }

    static strokePolyline(ctx, points, lineWidth, color) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.stroke();
    }

    static drawCoreBoneRect(ctx, startX, startY, endX, endY, thickness, color, hasOutline, outlineColor, outlineWidth) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY);
        if (length === 0) {
            return;
        }

        const angle = Math.atan2(deltaY, deltaX);
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        if (hasOutline) {
            ctx.fillStyle = outlineColor;
            ctx.fillRect(0, -(thickness / 2 + outlineWidth), length, thickness + outlineWidth * 2);
        }
        ctx.fillStyle = color;
        ctx.fillRect(0, -thickness / 2, length, thickness);
        ctx.restore();
    }
}
