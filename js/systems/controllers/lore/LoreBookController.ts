import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import { deriveArchetypeStats, formatCreatureSkills } from '../../../config/creatureStats.js';
import { CreatureBaseStats, CreatureSkills } from '../../../config/creatureTypes.js';
import Player from '../../../entities/player/Player.js';
import Wanderer from '../../../entities/Wanderer.js';
import WorldMap from '../../world/worldMap/WorldMap.js';
import { getDeveloperModeConfig } from '../../../utils/DeveloperModeConfig.js';
import { getWorldMonsterBehaviorCodexSnapshot } from '../../combat/MonsterBehaviorDirector.js';

type LoreBookElements = {
    loreBody: HTMLElement;
};

type KnownTravelerEntry = {
    id: string;
    name: string;
    level: number;
    disposition: 'hostile' | 'peaceful';
    baseStats: CreatureBaseStats;
    skills: CreatureSkills;
    maxHp: number;
    damage: number;
    armor: number;
    maxMana: number;
    magicPoints: number;
    encounterDescription: string;
};

export default class LoreBookController {
    private readonly elements: LoreBookElements;
    private readonly player: Player;
    private readonly worldMap: WorldMap;
    private readonly knownTravelers = new Map<string, KnownTravelerEntry>();

    constructor(elements: LoreBookElements, player: Player, worldMap: WorldMap) {
        this.elements = elements;
        this.player = player;
        this.worldMap = worldMap;
    }

    public rememberTraveler(traveler: Wanderer, disposition: 'hostile' | 'peaceful'): void {
        const id = `${traveler.name}-${traveler.level}`;
        this.knownTravelers.set(id, {
            id,
            name: traveler.name,
            level: traveler.level,
            disposition,
            baseStats: traveler.getBaseStatsRecord(),
            skills: traveler.getSkillRecord(),
            maxHp: traveler.maxHp,
            damage: traveler.damage,
            armor: traveler.armor,
            maxMana: traveler.maxMana,
            magicPoints: traveler.magicPoints,
            encounterDescription: traveler.getEncounterDescription(),
        });
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public render(): void {
        const playerSkills = this.player.getSkillRecord();
        const playerBaseStats = this.player.getBaseStatsRecord();
        const villages = this.worldMap.getKnownVillages();
        const archetypeMarkup = this.buildArchetypeMarkup();
        const travelerMarkup = this.buildTravelerMarkup();
        const villageMarkup = this.buildVillageMarkup(villages);
        const devMonsterBehaviorMarkup = this.buildDeveloperMonsterBehaviorMarkup();

        this.elements.loreBody.innerHTML = `
            <section class="lore-section">
                <h3>Current hero</h3>
                <article class="lore-entry">
                    <h4>${this.escapeHtml(this.player.name)}</h4>
                    <p><strong>Base stats:</strong> HP ${playerBaseStats.hp}, DMG ${playerBaseStats.damage}, ARM ${playerBaseStats.armor}, Mana ${playerBaseStats.mana}</p>
                    <p><strong>Skills:</strong> ${this.escapeHtml(formatCreatureSkills(playerSkills))}</p>
                    <p><strong>Resulting stats:</strong> HP ${this.player.maxHp}, DMG ${this.player.getPhysicalDamageWithBuff()}, ARM ${this.player.armor}, Dodge ${(this.player.avoidChance * 100).toFixed(1)}%, Mana ${this.player.maxMana}, Magic ${this.player.magicPoints}</p>
                    <p><strong>Level:</strong> ${this.player.level} &middot; <strong>Skill points:</strong> ${this.player.skillPoints}</p>
                </article>
            </section>
            <section class="lore-section">
                <h3>Known characters</h3>
                ${travelerMarkup}
            </section>
            <section class="lore-section">
                <h3>Known villages</h3>
                ${villageMarkup}
            </section>
            <section class="lore-section">
                <h3>Creature compendium</h3>
                ${archetypeMarkup}
            </section>
            ${devMonsterBehaviorMarkup}
        `;
    }


    // eslint-disable-next-line style-guide/function-length-warning
    private buildDeveloperMonsterBehaviorMarkup(): string {
        if (!getDeveloperModeConfig().enabled) {
            return '';
        }

        const codex = getWorldMonsterBehaviorCodexSnapshot();
        const entries = Object.entries(codex);
        if (entries.length === 0) {
            return `
                <section class="lore-section">
                    <h3>Monster behavior codex (DEV)</h3>
                    <p class="lore-empty">No monster behavior codex has been generated yet.</p>
                </section>
            `;
        }

        const behaviorMarkup = entries
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([monsterType, behaviors]) => {
                const lines = behaviors
                    .map((behavior) => `<li><strong>${this.escapeHtml(behavior.id)}</strong> (w=${behavior.weight}): ${this.escapeHtml(behavior.moves.join(' -> '))}</li>`)
                    .join('');
                return `
                    <article class="lore-entry">
                        <h4>${this.escapeHtml(monsterType)}</h4>
                        <ul>${lines}</ul>
                    </article>
                `;
            })
            .join('');

        return `
            <section class="lore-section">
                <h3>Monster behavior codex (DEV)</h3>
                ${behaviorMarkup}
            </section>
        `;
    }

    // eslint-disable-next-line style-guide/arrow-function-style
    private buildArchetypeMarkup(): string {
        return Object.values(balanceConfig.creatureArchetypes)
            .map((archetype) => {
                const derived = deriveArchetypeStats(archetype);
                return `
                    <article class="lore-entry">
                        <h4>${this.escapeHtml(archetype.name)} <span class="lore-tag">${this.escapeHtml(archetype.category)}</span></h4>
                        <p>${this.escapeHtml(archetype.description)}</p>
                        <p><strong>Base stats:</strong> HP ${archetype.baseStats.hp}, DMG ${archetype.baseStats.damage}, ARM ${archetype.baseStats.armor}, Mana ${archetype.baseStats.mana}</p>
                        <p><strong>Skills:</strong> ${this.escapeHtml(formatCreatureSkills(archetype.skills))}</p>
                        <p><strong>Resulting stats:</strong> HP ${derived.maxHp}, DMG ${derived.physicalDamage}, ARM ${derived.armor}, Dodge ${(derived.avoidChance * 100).toFixed(1)}%, Mana ${derived.maxMana}, Magic ${derived.magicPoints}</p>
                        ${archetype.notes?.length ? `<ul>${archetype.notes.map((note) => `<li>${this.escapeHtml(note)}</li>`).join('')}</ul>` : ''}
                    </article>
                `;
            })
            .join('');
    }

    // eslint-disable-next-line style-guide/arrow-function-style
    private buildTravelerMarkup(): string {
        return Array.from(this.knownTravelers.values())
            .sort((left, right) => left.name.localeCompare(right.name) || left.level - right.level)
            .map((traveler) => `
                <article class="lore-entry">
                    <h4>${this.escapeHtml(traveler.name)} <span class="lore-tag">wanderer Lv.${traveler.level}</span></h4>
                    <p><strong>Disposition:</strong> ${this.escapeHtml(traveler.disposition)}</p>
                    <p><strong>Base stats:</strong> HP ${traveler.baseStats.hp}, DMG ${traveler.baseStats.damage}, ARM ${traveler.baseStats.armor}, Mana ${traveler.baseStats.mana}</p>
                    <p><strong>Skills:</strong> ${this.escapeHtml(formatCreatureSkills(traveler.skills))}</p>
                    <p><strong>Resulting stats:</strong> HP ${traveler.maxHp}, DMG ${traveler.damage}, ARM ${traveler.armor}, Mana ${traveler.maxMana}, Magic ${traveler.magicPoints}</p>
                    <p>${this.escapeHtml(traveler.encounterDescription)}</p>
                </article>
            `)
            .join('') || '<p class="lore-empty">No wanderers recorded yet.</p>';
    }

    private buildVillageMarkup(villages: ReturnType<WorldMap['getKnownVillages']>): string {
        if (villages.length === 0) {
            return '<p class="lore-empty">No villages discovered yet.</p>';
        }
        return villages.map((village) => `
            <article class="lore-entry">
                <h4>${this.escapeHtml(village.name)}</h4>
                <p><strong>Location:</strong> (${village.col}, ${village.row})</p>
                <p><strong>Terrain:</strong> ${this.escapeHtml(village.terrain)}</p>
                <p><strong>Status:</strong> ${this.escapeHtml(village.status)}</p>
            </article>
        `).join('');
    }

    private escapeHtml = (value: string): string => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
