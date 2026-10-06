import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';
import { SpellContext, SpellEffect, SpellEffectResult } from './MagicTypes.js';

export class MagicDamageEffect implements SpellEffect {
    public readonly type = 'magicDamage' as const;

    constructor(private readonly baseDamage: number, private readonly perLevelDamage: number) {}

    public apply(context: SpellContext): SpellEffectResult {
        const totalDamage = Math.round(
            (this.baseDamage + this.perLevelDamage * (context.level - 1)) * context.caster.getMagicPowerMultiplier(),
        );

        if (context.target instanceof Skeleton || context.target instanceof Player) {
            context.target.takeMagicDamage(totalDamage);
        }

        return { type: this.type, amount: totalDamage, ignoredArmor: true };
    }
}

export class CurseArmorBreakEffect implements SpellEffect {
    public readonly type = 'curseArmorBreak' as const;

    constructor(private readonly baseReduction: number, private readonly perLevelReduction: number, private readonly baseDuration: number) {}

    public apply(context: SpellContext): SpellEffectResult {
        const amount = this.baseReduction + this.perLevelReduction * (context.level - 1);
        const duration = this.baseDuration + context.level - 1;

        if (context.target instanceof Skeleton) {
            context.target.applyCurse(amount, duration);
        }

        return { type: this.type, amount, duration };
    }
}

export class SlowEffect implements SpellEffect {
    public readonly type = 'slow' as const;

    constructor(private readonly baseDuration: number) {}

    public apply(context: SpellContext): SpellEffectResult {
        const duration = this.baseDuration + context.level - 1;

        if (context.target instanceof Skeleton) {
            context.target.applySlow(duration);
        }

        return { type: this.type, duration };
    }
}

export class RageEffect implements SpellEffect {
    public readonly type = 'rage' as const;

    constructor(private readonly baseDuration: number, private readonly baseMultiplier: number, private readonly perLevelMultiplier: number) {}

    public apply(context: SpellContext): SpellEffectResult {
        const duration = this.baseDuration + context.level - 1;
        const multiplier = this.baseMultiplier + this.perLevelMultiplier * (context.level - 1);

        if (context.target instanceof Player) {
            context.target.applyRage(duration, multiplier);
        }

        return { type: this.type, duration, multiplier };
    }
}
