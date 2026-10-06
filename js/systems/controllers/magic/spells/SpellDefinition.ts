import { Spell, SpellEffect, SpellTargetType } from '../MagicTypes.js';

export type BaseSpellId = 'fireball' | 'curse' | 'slow' | 'rage' | 'arcane-lance';

export type SpellLevelDefinition = {
    level: number;
    manaCost: number;
    name: string;
    description: string;
};

export interface SpellDefinition {
    readonly baseId: BaseSpellId;
    readonly targetType: SpellTargetType;
    readonly levels: SpellLevelDefinition[];
    buildLevelSpell(level: SpellLevelDefinition): Spell;
}

export const buildSpellId = (baseId: BaseSpellId, level: number): string => `${baseId}-lvl-${level}`;

export const createSpellFromDefinition = (
    definition: SpellDefinition,
    level: SpellLevelDefinition,
    effects: SpellEffect[],
): Spell => ({
    id: buildSpellId(definition.baseId, level.level),
    name: level.name,
    description: level.description,
    targetType: definition.targetType,
    level: level.level,
    manaCost: level.manaCost,
    cast: (context) => effects.map((effect) => effect.apply(context)),
});
