import { MagicDamageEffect } from '../SpellEffects.js';
import { SpellDefinition, SpellLevelDefinition, createSpellFromDefinition } from './SpellDefinition.js';

export class FireballSpellDefinition implements SpellDefinition {
    public readonly baseId = 'fireball' as const;
    public readonly targetType = 'enemy' as const;
    public readonly levels: SpellLevelDefinition[] = [
        { level: 1, manaCost: 3, name: 'Fire Ball I', description: 'A burning projectile that deals armor-piercing magic damage.' },
        { level: 2, manaCost: 5, name: 'Fire Ball II', description: 'A stronger fireball with amplified impact.' },
    ];

    public buildLevelSpell(level: SpellLevelDefinition) {
        return createSpellFromDefinition(this, level, [new MagicDamageEffect(4, 2)]);
    }
}
