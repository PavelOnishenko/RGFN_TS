import BattleMap from '../combat/BattleMap.js';
import Player from '../../entities/player/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { BaseSpellId } from '../controllers/magic/MagicSystem.js';

export default class BattleTargetResolver {
    private player: Player;
    private battleMap: BattleMap;
    private getSelectedEnemy: () => Skeleton | null;

    constructor(player: Player, battleMap: BattleMap, getSelectedEnemy: () => Skeleton | null) {
        this.player = player;
        this.battleMap = battleMap;
        this.getSelectedEnemy = getSelectedEnemy;
    }

    public resolveAttackTarget = (enemies: Skeleton[]): Skeleton | null => this.resolveRangedTarget(enemies, this.player.getAttackRange());

    public resolveSpellTarget(spellId: BaseSpellId, enemies: Skeleton[]): Skeleton | null {
        const spellRange = spellId === 'slow' ? balanceConfig.combat.spellRanges.slow : this.player.getAttackRange();
        return this.resolveRangedTarget(enemies, spellRange);
    }

    public resolveDirectionalTarget(enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.getSelectedEnemy();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInMeleeRange(this.player, selectedEnemy)) {
            return selectedEnemy;
        }

        return enemies.find((enemy) => this.battleMap.isInMeleeRange(this.player, enemy)) ?? null;
    }

    private resolveRangedTarget(enemies: Skeleton[], range: number): Skeleton | null {
        const selectedEnemy = this.getSelectedEnemy();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInAttackRange(this.player, selectedEnemy, range)) {
            return selectedEnemy;
        }

        return enemies.find((enemy) => this.battleMap.isInAttackRange(this.player, enemy, range)) ?? null;
    }
}
