import { RageEffect } from '../SpellEffects.js';
import { SpellDefinition, SpellLevelDefinition, createSpellFromDefinition } from './SpellDefinition.js';

export class RageSpellDefinition implements SpellDefinition {
    public readonly baseId = 'rage' as const;
    public readonly targetType = 'self' as const;
    public readonly levels: SpellLevelDefinition[] = [
        { level: 1, manaCost: 2, name: 'Rage I', description: 'Empowers your attacks and spells for a short duration.' },
        { level: 2, manaCost: 4, name: 'Rage II', description: 'Greater and longer self-buff.' },
    ];

    public buildLevelSpell(level: SpellLevelDefinition) {
        return createSpellFromDefinition(this, level, [new RageEffect(2, 1.25, 0.15)]);
    }
}
