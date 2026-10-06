const IMPORT_SCALE = 0.5;
const IMPORT_BONE_SCALE_MULTIPLIER = 0.76;
const IMPORT_HEAD_SCALE_MULTIPLIER = 0.82;
const IMPORT_HEAD_UP_OFFSET = -9;
const IMPORT_ORIGIN_X = 400;
const IMPORT_ORIGIN_Y = 300;

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function pointFromAngle(originX, originY, length, angle) {
    return {
        x: originX + Math.sin(angle) * length,
        y: originY + Math.cos(angle) * length
    };
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function lerpImportedParams(a, b, t) {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        headTilt: lerp(a.headTilt, b.headTilt, t),
        torsoAngle: lerp(a.torsoAngle, b.torsoAngle, t),
        torsoLength: lerp(a.torsoLength, b.torsoLength, t),
        leftUpperArmLength: lerp(a.leftUpperArmLength, b.leftUpperArmLength, t),
        leftForearmLength: lerp(a.leftForearmLength, b.leftForearmLength, t),
        rightUpperArmLength: lerp(a.rightUpperArmLength, b.rightUpperArmLength, t),
        rightForearmLength: lerp(a.rightForearmLength, b.rightForearmLength, t),
        leftThighLength: lerp(a.leftThighLength, b.leftThighLength, t),
        leftCalfLength: lerp(a.leftCalfLength, b.leftCalfLength, t),
        rightThighLength: lerp(a.rightThighLength, b.rightThighLength, t),
        rightCalfLength: lerp(a.rightCalfLength, b.rightCalfLength, t),
        hipLength: lerp(a.hipLength, b.hipLength, t),
        shoulderLength: lerp(a.shoulderLength, b.shoulderLength, t),
        leftShoulderAngle: lerp(a.leftShoulderAngle, b.leftShoulderAngle, t),
        leftElbowAngle: lerp(a.leftElbowAngle, b.leftElbowAngle, t),
        rightShoulderAngle: lerp(a.rightShoulderAngle, b.rightShoulderAngle, t),
        rightElbowAngle: lerp(a.rightElbowAngle, b.rightElbowAngle, t),
        leftHipAngle: lerp(a.leftHipAngle, b.leftHipAngle, t),
        leftKneeAngle: lerp(a.leftKneeAngle, b.leftKneeAngle, t),
        rightHipAngle: lerp(a.rightHipAngle, b.rightHipAngle, t),
        rightKneeAngle: lerp(a.rightKneeAngle, b.rightKneeAngle, t)
    };
}

export function getImportedAnimationParamsAt(keyframes, meta, progress) {
    if (!Array.isArray(keyframes) || keyframes.length === 0) {
        throw new Error('Animation keyframes cannot be empty');
    }

    if (keyframes.length === 1) {
        return keyframes[0].params;
    }

    const duration = Math.max(0.0001, meta.duration || 0);
    const time = clamp01(progress) * duration;
    const wrappedTime = meta.loop ? ((time % duration) + duration) % duration : Math.max(0, Math.min(duration, time));
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);

    let previous = sorted[0];
    let next = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
        if (wrappedTime >= sorted[i].time && wrappedTime <= sorted[i + 1].time) {
            previous = sorted[i];
            next = sorted[i + 1];
            break;
        }
    }

    if (previous.time === next.time) {
        return previous.params;
    }

    const localProgress = (wrappedTime - previous.time) / (next.time - previous.time);
    return lerpImportedParams(previous.params, next.params, localProgress);
}

function convertImportedParamsToPose(params) {
    const scale = IMPORT_SCALE * IMPORT_BONE_SCALE_MULTIPLIER;
    const translationX = (params.x - IMPORT_ORIGIN_X) * scale;
    const translationY = (params.y - IMPORT_ORIGIN_Y) * scale;
    const torsoTopX = 0;
    const torsoTopY = -20;
    const torsoEndX = torsoTopX + Math.sin(params.torsoAngle) * params.torsoLength * scale;
    const torsoEndY = torsoTopY + Math.cos(params.torsoAngle) * params.torsoLength * scale;

    const shoulderHalf = (params.shoulderLength * scale) / 2;
    const hipHalf = (params.hipLength * scale) / 2;

    const leftShoulderX = torsoTopX - shoulderHalf;
    const rightShoulderX = torsoTopX + shoulderHalf;
    const shouldersY = torsoTopY + 2;

    const leftHipX = torsoEndX - hipHalf;
    const rightHipX = torsoEndX + hipHalf;
    const hipsY = torsoEndY;

    const leftElbow = pointFromAngle(leftShoulderX, shouldersY, params.leftUpperArmLength * scale, params.leftShoulderAngle);
    const leftHand = pointFromAngle(leftElbow.x, leftElbow.y, params.leftForearmLength * scale, params.leftShoulderAngle + params.leftElbowAngle);

    const rightElbow = pointFromAngle(rightShoulderX, shouldersY, params.rightUpperArmLength * scale, params.rightShoulderAngle);
    const rightHand = pointFromAngle(rightElbow.x, rightElbow.y, params.rightForearmLength * scale, params.rightShoulderAngle + params.rightElbowAngle);

    const leftKnee = pointFromAngle(leftHipX, hipsY, params.leftThighLength * scale, params.leftHipAngle);
    const leftFoot = pointFromAngle(leftKnee.x, leftKnee.y, params.leftCalfLength * scale, params.leftHipAngle + params.leftKneeAngle);

    const rightKnee = pointFromAngle(rightHipX, hipsY, params.rightThighLength * scale, params.rightHipAngle);
    const rightFoot = pointFromAngle(rightKnee.x, rightKnee.y, params.rightCalfLength * scale, params.rightHipAngle + params.rightKneeAngle);

    return {
        torsoTopX: translationX,
        headY: torsoTopY + translationY,
        headTilt: params.headTilt,
        headScale: IMPORT_HEAD_SCALE_MULTIPLIER,
        headOffsetY: IMPORT_HEAD_UP_OFFSET,
        torsoEndY: torsoEndY + translationY,
        leftShoulderX: leftShoulderX + translationX,
        leftShoulderY: shouldersY + translationY,
        leftElbowX: leftElbow.x + translationX,
        leftElbowY: leftElbow.y + translationY,
        leftHandX: leftHand.x + translationX,
        leftHandY: leftHand.y + translationY,
        rightShoulderX: rightShoulderX + translationX,
        rightShoulderY: shouldersY + translationY,
        rightElbowX: rightElbow.x + translationX,
        rightElbowY: rightElbow.y + translationY,
        rightHandX: rightHand.x + translationX,
        rightHandY: rightHand.y + translationY,
        leftHipX: leftHipX + translationX,
        leftHipY: hipsY + translationY,
        leftKneeX: leftKnee.x + translationX,
        leftKneeY: leftKnee.y + translationY,
        leftFootX: leftFoot.x + translationX,
        leftFootY: leftFoot.y + translationY,
        rightHipX: rightHipX + translationX,
        rightHipY: hipsY + translationY,
        rightKneeX: rightKnee.x + translationX,
        rightKneeY: rightKnee.y + translationY,
        rightFootX: rightFoot.x + translationX,
        rightFootY: rightFoot.y + translationY
    };
}

export function getPoseFromImportedAnimation(keyframes, meta, progress) {
    const params = getImportedAnimationParamsAt(keyframes, meta, progress);
    return convertImportedParamsToPose(params);
}
