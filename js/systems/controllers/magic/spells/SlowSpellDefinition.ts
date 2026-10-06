import { SlowEffect } from '../SpellEffects.js';
import { SpellDefinition, SpellLevelDefinition, createSpellFromDefinition } from './SpellDefinition.js';

export class SlowSpellDefinition implements SpellDefinition {
    public readonly baseId = 'slow' as const;
    public readonly targetType = 'enemy' as const;
    public readonly levels: SpellLevelDefinition[] = [
        { level: 1, manaCost: 2, name: 'Slow I', description: 'Makes an enemy lose turns.' },
        { level: 2, manaCost: 4, name: 'Slow II', description: 'Longer temporal drag for enemy turns.' },
    ];

    public buildLevelSpell(level: SpellLevelDefinition) {
        return createSpellFromDefinition(this, level, [new SlowEffect(1)]);
    }
}
