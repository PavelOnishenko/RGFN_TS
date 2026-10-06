import { MagicDamageEffect } from '../SpellEffects.js';
import { SpellDefinition, SpellLevelDefinition, createSpellFromDefinition } from './SpellDefinition.js';

export class ArcaneLanceSpellDefinition implements SpellDefinition {
    public readonly baseId = 'arcane-lance' as const;
    public readonly targetType = 'enemy' as const;
    public readonly levels: SpellLevelDefinition[] = [
        { level: 1, manaCost: 2, name: 'Arcane Lance I', description: 'Focused arcane strike that pierces armor.' },
        { level: 2, manaCost: 4, name: 'Arcane Lance II', description: 'Sharper lance with increased magical pressure.' },
    ];

    public buildLevelSpell(level: SpellLevelDefinition) {
        return createSpellFromDefinition(this, level, [new MagicDamageEffect(3, 2)]);
    }
}
