import { CurseArmorBreakEffect, MagicDamageEffect } from '../SpellEffects.js';
import { SpellDefinition, SpellLevelDefinition, createSpellFromDefinition } from './SpellDefinition.js';

export class CurseSpellDefinition implements SpellDefinition {
    public readonly baseId = 'curse' as const;
    public readonly targetType = 'enemy' as const;
    public readonly levels: SpellLevelDefinition[] = [
        { level: 1, manaCost: 3, name: 'Curse I', description: 'Weakens enemy protection and chips away with magic.' },
        { level: 2, manaCost: 5, name: 'Curse II', description: 'Longer curse and stronger magical corrosion.' },
    ];

    public buildLevelSpell(level: SpellLevelDefinition) {
        return createSpellFromDefinition(this, level, [new CurseArmorBreakEffect(1, 1, 2), new MagicDamageEffect(2, 1)]);
    }
}
