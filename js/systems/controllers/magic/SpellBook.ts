import { Spell } from './MagicTypes.js';
import { getSpellDefinitions } from './spells/SpellRegistry.js';

export const createSpellBook = (): Spell[] =>
    getSpellDefinitions().flatMap((definition) => definition.levels.map((level) => definition.buildLevelSpell(level)));
