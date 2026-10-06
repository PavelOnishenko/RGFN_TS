import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';
import { Spell } from './MagicTypes.js';
import { getBaseSpellIds } from './spells/SpellRegistry.js';
import { BaseSpellId } from './spells/SpellDefinition.js';
import { createSpellBook } from './SpellBook.js';

const BASE_SPELL_IDS = getBaseSpellIds();

export default class MagicSystem {
    private readonly player: Player;
    private readonly spellLevels: Record<BaseSpellId, number>;

    constructor(player: Player) {
        this.player = player;
        this.spellLevels = BASE_SPELL_IDS.reduce(
            (levels, baseId) => ({ ...levels, [baseId]: 0 }),
            {} as Record<BaseSpellId, number>,
        );
    }

    public getSpellLevels = (): Record<BaseSpellId, number> => ({ ...this.spellLevels });

    public restoreSpellLevels(levels: Partial<Record<BaseSpellId, number>>): void {
        for (const baseId of BASE_SPELL_IDS) {
            const level = levels[baseId];
            this.spellLevels[baseId] = typeof level === 'number' && Number.isFinite(level) && level >= 0 ? Math.floor(level) : 0;
        }
    }

    public getAvailableSpells(): Spell[] {
        const spellBook = createSpellBook();
        const spellsByBase = new Map<BaseSpellId, Spell>();

        for (const spell of spellBook) {
            const parsed = this.parseSpellId(spell.id);
            if (!parsed) {
                continue;
            }

            const learnedLevel = this.spellLevels[parsed.baseId];
            if (parsed.level <= learnedLevel) {
                const current = spellsByBase.get(parsed.baseId);
                if (!current || this.getSpellLevel(current.id) < parsed.level) {
                    spellsByBase.set(parsed.baseId, spell);
                }
            }
        }

        return Array.from(spellsByBase.values());
    }

    public investSpellPoint(baseId: BaseSpellId): boolean {
        if (this.player.magicPoints <= 0) {
            return false;
        }

        this.player.magicPoints -= 1;
        this.spellLevels[baseId] += 1;
        return true;
    }

    public castSpell(baseId: BaseSpellId, target: Skeleton | Player): { ok: boolean; message: string } {
        const level = this.spellLevels[baseId];
        if (level <= 0) {
            return { ok: false, message: `Learn ${baseId} first (current level 0).` };
        }

        const spell = this.getHighestLearnedSpell(baseId);
        if (!spell) {
            return { ok: false, message: 'Spell level data not found.' };
        }

        if (!this.player.canSpendMana(spell.manaCost)) {
            return { ok: false, message: `Not enough mana for ${spell.name}.` };
        }

        this.player.spendMana(spell.manaCost);
        const effectiveLevel = this.getSpellLevel(spell.id);
        const results = spell.cast({ caster: this.player, target, level: effectiveLevel });

        const pieces: string[] = [`${spell.name} cast (-${spell.manaCost} mana).`];
        for (const result of results) {
            if (result.type === 'magicDamage') {
                pieces.push(`Magic damage ${result.amount} (ignores armor).`);
            }
            if (result.type === 'curseArmorBreak') {
                pieces.push(`Curse: armor reduction ${result.amount} for ${result.duration} turns.`);
            }
            if (result.type === 'slow') {
                pieces.push(`Slow: target skips ${result.duration} turn(s).`);
            }
            if (result.type === 'rage') {
                pieces.push(`Rage: x${result.multiplier?.toFixed(2)} power for ${result.duration} turns.`);
            }
        }

        return { ok: true, message: pieces.join(' ') };
    }

    private getHighestLearnedSpell(baseId: BaseSpellId): Spell | undefined {
        const learnedLevel = this.spellLevels[baseId];
        return createSpellBook()
            .map((spell) => ({ spell, parsed: this.parseSpellId(spell.id) }))
            .filter((entry) => entry.parsed && entry.parsed.baseId === baseId && entry.parsed.level <= learnedLevel)
            .sort((a, b) => (b.parsed?.level ?? 0) - (a.parsed?.level ?? 0))[0]?.spell;
    }

    private parseSpellId(spellId: string): { baseId: BaseSpellId; level: number } | null {
        const [baseIdToken, levelToken] = spellId.split('-lvl-');
        if (!BASE_SPELL_IDS.includes(baseIdToken as BaseSpellId)) {
            return null;
        }

        const level = Number(levelToken);
        if (!Number.isFinite(level) || level <= 0) {
            return null;
        }

        return { baseId: baseIdToken as BaseSpellId, level };
    }

    private getSpellLevel = (spellId: string): number => this.parseSpellId(spellId)?.level ?? 0;
}


export type { BaseSpellId };
