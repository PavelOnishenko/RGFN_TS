import Skeleton from '../../entities/Skeleton.js';
import { CombatMove } from '../combat/DirectionalCombat.js';

export type BattleUI = {
    enemyName: HTMLElement;
    enemyHp: HTMLElement;
    enemyMaxHp: HTMLElement;
    attackBtn: HTMLButtonElement;
    directionalButtons: Record<CombatMove, HTMLButtonElement>;
    fleeBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    usePotionBtn: HTMLButtonElement;
    useManaPotionBtn: HTMLButtonElement;
    spellFireballBtn: HTMLButtonElement;
    spellCurseBtn: HTMLButtonElement;
    spellSlowBtn: HTMLButtonElement;
    spellRageBtn: HTMLButtonElement;
    spellArcaneLanceBtn: HTMLButtonElement;
};

export type SelectionResult = {
    selectedEnemy: Skeleton | null;
    moved: boolean;
};
