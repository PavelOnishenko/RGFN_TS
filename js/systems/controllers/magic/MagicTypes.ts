import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';

export type SpellTargetType = 'enemy' | 'self';

export type SpellEffectType = 'magicDamage' | 'curseArmorBreak' | 'slow' | 'rage';

export type SpellContext = {
    caster: Player;
    target: Skeleton | Player;
    level: number;
};

export type SpellEffectResult = {
    type: SpellEffectType;
    amount?: number;
    duration?: number;
    multiplier?: number;
    ignoredArmor?: boolean;
};

export interface SpellEffect {
    readonly type: SpellEffectType;
    apply(context: SpellContext): SpellEffectResult;
}

export interface Spell {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly targetType: SpellTargetType;
    readonly level: number;
    readonly manaCost: number;
    cast(context: SpellContext): SpellEffectResult[];
}
