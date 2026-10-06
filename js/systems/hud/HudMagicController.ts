import Player from '../../entities/player/Player.js';
import MagicSystem from '../controllers/magic/MagicSystem.js';
import { BattleUiHudElements, HudElements } from './HudTypes.js';

export default class HudMagicController {
    private readonly player: Player;
    private readonly hudElements: HudElements;
    private readonly battleUI: BattleUiHudElements;
    private readonly magicSystem: MagicSystem;

    constructor(player: Player, hudElements: HudElements, battleUI: BattleUiHudElements, magicSystem: MagicSystem) {
        this.player = player;
        this.hudElements = hudElements;
        this.battleUI = battleUI;
        this.magicSystem = magicSystem;
    }

    public renderSpellLevelsAndDetails(): void {
        const spellLevels = this.magicSystem.getSpellLevels();
        this.hudElements.spellLevelFireball.textContent = String(spellLevels.fireball);
        this.hudElements.spellLevelCurse.textContent = String(spellLevels.curse);
        this.hudElements.spellLevelSlow.textContent = String(spellLevels.slow);
        this.hudElements.spellLevelRage.textContent = String(spellLevels.rage);
        this.hudElements.spellLevelArcaneLance.textContent = String(spellLevels['arcane-lance']);

        const fireballLevel = Math.max(1, spellLevels.fireball || 1);
        const curseLevel = Math.max(1, spellLevels.curse || 1);
        const slowLevel = Math.max(1, spellLevels.slow || 1);
        const rageLevel = Math.max(1, spellLevels.rage || 1);
        const arcaneLanceLevel = Math.max(1, spellLevels['arcane-lance'] || 1);

        const fireballDamage = 4 + 2 * (fireballLevel - 1);
        const curseDamage = 2 + (curseLevel - 1);
        const curseArmorReduction = 1 + (curseLevel - 1);
        const curseTurns = 2 + (curseLevel - 1);
        const slowTurns = 1 + (slowLevel - 1);
        const rageTurns = 2 + (rageLevel - 1);
        const rageMultiplier = 1.25 + 0.15 * (rageLevel - 1);
        const arcaneLanceDamage = 3 + 2 * (arcaneLanceLevel - 1);

        this.hudElements.spellDetailsFireball.textContent = `Mana ${fireballLevel === 1 ? 3 : 5} • Magic damage ${fireballDamage} (ignores armor)`;
        this.hudElements.spellDetailsCurse.textContent = `Mana ${curseLevel === 1 ? 3 : 5} • Magic damage ${curseDamage} • Armor -${curseArmorReduction} for ${curseTurns} turns`;
        this.hudElements.spellDetailsSlow.textContent = `Mana ${slowLevel === 1 ? 2 : 4} • Target skips ${slowTurns} turn(s)`;
        this.hudElements.spellDetailsRage.textContent = `Mana ${rageLevel === 1 ? 2 : 4} • x${rageMultiplier.toFixed(2)} power for ${rageTurns} turns`;
        this.hudElements.spellDetailsArcaneLance.textContent = `Mana ${arcaneLanceLevel === 1 ? 2 : 4} • Magic damage ${arcaneLanceDamage} (ignores armor)`;
    }

    public updateSpellButtons(): void {
        const availableSpells = this.magicSystem.getAvailableSpells();
        const manaBySpell = new Map(availableSpells.map((spell) => [spell.id.split('-lvl-')[0], spell.manaCost]));
        this.battleUI.spellFireballBtn.disabled = !this.player.canSpendMana(manaBySpell.get('fireball') ?? 999);
        this.battleUI.spellCurseBtn.disabled = !this.player.canSpendMana(manaBySpell.get('curse') ?? 999);
        this.battleUI.spellSlowBtn.disabled = !this.player.canSpendMana(manaBySpell.get('slow') ?? 999);
        this.battleUI.spellRageBtn.disabled = !this.player.canSpendMana(manaBySpell.get('rage') ?? 999);
        this.battleUI.spellArcaneLanceBtn.disabled = !this.player.canSpendMana(manaBySpell.get('arcane-lance') ?? 999);
    }
}
