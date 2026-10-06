import BattleMap from '../combat/BattleMap.js';
import Player from '../../entities/player/Player.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import MagicSystem from '../controllers/magic/MagicSystem.js';
import { BattleUI } from './BattleUiTypes.js';
import BattleUiTargeting from './BattleUiTargeting.js';

export default class BattleUiActionAvailability {
    private battleUI: BattleUI;
    private battleMap: BattleMap;
    private player: Player;
    private magicSystem: MagicSystem;
    private targeting: BattleUiTargeting;

    constructor(battleUI: BattleUI, battleMap: BattleMap, player: Player, magicSystem: MagicSystem, targeting: BattleUiTargeting) {
        this.battleUI = battleUI;
        this.battleMap = battleMap;
        this.player = player;
        this.magicSystem = magicSystem;
        this.targeting = targeting;
    }

    public setButtonsEnabled(enabled: boolean): void {
        this.refreshActionAvailability();
        this.battleUI.attackBtn.disabled = !enabled;
        Object.values(this.battleUI.directionalButtons).forEach((button) => {
            button.disabled = !enabled;
        });
        this.battleUI.fleeBtn.disabled = !enabled || !this.battleMap.isEntityOnEdge(this.player);
        this.battleUI.waitBtn.disabled = !enabled;
        this.battleUI.usePotionBtn.disabled = !enabled;
        this.battleUI.useManaPotionBtn.disabled = !enabled;
        this.battleUI.spellFireballBtn.disabled = !enabled;
        this.battleUI.spellCurseBtn.disabled = !enabled;
        this.battleUI.spellSlowBtn.disabled = !enabled;
        this.battleUI.spellRageBtn.disabled = !enabled;
        this.battleUI.spellArcaneLanceBtn.disabled = !enabled;
    }

    public refreshActionAvailability(): void {
        const context = this.buildActionContext();
        this.setActionVisible(this.battleUI.attackBtn, context.hasAttackTarget && !context.directionalVisible);
        Object.values(this.battleUI.directionalButtons).forEach((button) => this.setActionVisible(button, context.directionalVisible));
        this.setActionVisible(this.battleUI.fleeBtn, context.canFlee);
        this.setActionVisible(this.battleUI.waitBtn, true);
        this.setActionVisible(this.battleUI.usePotionBtn, context.hasHealingPotion);
        this.setActionVisible(this.battleUI.useManaPotionBtn, context.hasManaPotion);
        this.setActionVisible(this.battleUI.spellFireballBtn, context.hasEnemySpellTarget && this.canCast('fireball', context.manaBySpell));
        this.setActionVisible(this.battleUI.spellCurseBtn, context.hasEnemySpellTarget && this.canCast('curse', context.manaBySpell));
        this.setActionVisible(this.battleUI.spellSlowBtn, context.hasEnemySlowTarget && this.canCast('slow', context.manaBySpell));
        this.setActionVisible(this.battleUI.spellRageBtn, this.canCast('rage', context.manaBySpell));
        this.setActionVisible(this.battleUI.spellArcaneLanceBtn, context.hasEnemySpellTarget && this.canCast('arcane-lance', context.manaBySpell));
    }

    private buildActionContext(): {
        hasAttackTarget: boolean;
        directionalVisible: boolean;
        canFlee: boolean;
        hasHealingPotion: boolean;
        hasManaPotion: boolean;
        hasEnemySpellTarget: boolean;
        hasEnemySlowTarget: boolean;
        manaBySpell: Map<string, number>;
        } {
        const hasAttackTarget = this.targeting.hasEnemyInAttackRange(this.player.getAttackRange());
        const hasDirectionalTarget = this.targeting.hasEnemyInDirectionalRange();

        return {
            hasAttackTarget,
            directionalVisible: hasDirectionalTarget && this.player.getAttackRange() === 1,
            canFlee: this.battleMap.isEntityOnEdge(this.player),
            hasHealingPotion: this.player.getHealingPotionCount() > 0,
            hasManaPotion: this.player.getManaPotionCount() > 0,
            hasEnemySpellTarget: hasAttackTarget,
            hasEnemySlowTarget: this.targeting.hasEnemyInAttackRange(this.getSpellRange('slow')),
            manaBySpell: this.getManaBySpell(),
        };
    }

    private getManaBySpell(): Map<string, number> {
        const availableSpells = this.magicSystem.getAvailableSpells();
        return new Map(availableSpells.map((spell) => [spell.id.split('-lvl-')[0], spell.manaCost]));
    }

    private canCast = (spellId: 'fireball' | 'curse' | 'slow' | 'rage' | 'arcane-lance', manaBySpell: Map<string, number>): boolean => this.player.canSpendMana(manaBySpell.get(spellId) ?? Number.POSITIVE_INFINITY);

    private getSpellRange = (spellId: 'slow'): number => balanceConfig.combat.spellRanges[spellId] ?? this.player.getAttackRange();

    private setActionVisible(button: HTMLButtonElement, visible: boolean): void {
        button.classList.toggle('hidden', !visible);
    }
}
