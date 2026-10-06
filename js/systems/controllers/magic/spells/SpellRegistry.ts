import { ArcaneLanceSpellDefinition } from './ArcaneLanceSpellDefinition.js';
import { CurseSpellDefinition } from './CurseSpellDefinition.js';
import { FireballSpellDefinition } from './FireballSpellDefinition.js';
import { RageSpellDefinition } from './RageSpellDefinition.js';
import { SlowSpellDefinition } from './SlowSpellDefinition.js';
import { BaseSpellId, SpellDefinition } from './SpellDefinition.js';

const spellRegistry: SpellDefinition[] = [
    new FireballSpellDefinition(),
    new CurseSpellDefinition(),
    new SlowSpellDefinition(),
    new RageSpellDefinition(),
    new ArcaneLanceSpellDefinition(),
];

export const getSpellDefinitions = (): SpellDefinition[] => spellRegistry.map((definition) => definition);

export const getBaseSpellIds = (): BaseSpellId[] => spellRegistry.map((definition) => definition.baseId);
