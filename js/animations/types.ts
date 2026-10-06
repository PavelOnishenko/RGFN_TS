export interface ImportedAnimationParams {
    x: number;
    y: number;
    headTilt: number;
    torsoAngle: number;
    torsoLength: number;
    leftUpperArmLength: number;
    leftForearmLength: number;
    rightUpperArmLength: number;
    rightForearmLength: number;
    leftThighLength: number;
    leftCalfLength: number;
    rightThighLength: number;
    rightCalfLength: number;
    hipLength: number;
    shoulderLength: number;
    leftShoulderAngle: number;
    leftElbowAngle: number;
    rightShoulderAngle: number;
    rightElbowAngle: number;
    leftHipAngle: number;
    leftKneeAngle: number;
    rightHipAngle: number;
    rightKneeAngle: number;
}

export interface ImportedKeyframe {
    time: number;
    params: ImportedAnimationParams;
}

export interface ImportedAnimationMeta {
    name: string;
    duration: number;
    loop: boolean;
}

export interface ImportedAnimationAsset {
    keyframes: ImportedKeyframe[];
    meta: ImportedAnimationMeta;
}
