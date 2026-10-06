import { getXpForLevel, levelConfig } from '../../../config/levelConfig.js';
import PlayerBase from './PlayerBase.js';
import { PlayerStat } from '../shared/PlayerTypes.js';

export default class PlayerProgression extends PlayerBase {
    public addXp(amount: number): boolean {
        if (this.level >= levelConfig.maxLevel) {return false;}
        this.xp += amount;
        if (this.xp < this.xpToNextLevel) {return false;}
        this.levelUp();
        return true;
    }

    public addStat(stat: PlayerStat, amount: number = 1): boolean {
        if (this.skillPoints < amount) {return false;}
        const previousIntelligence = this.intelligence;
        const previousHp = this.hp;
        const hadFullHp = this.hp >= this.maxHp;
        if (!this.applyStatIncrease(stat, amount)) {return false;}
        this.skillPoints -= amount;
        this.updateStats();
        this.hp = hadFullHp ? this.maxHp : Math.min(previousHp, this.maxHp);
        if (stat === 'intelligence') {this.magicPoints += Math.max(0, Math.floor(this.intelligence / 3) - Math.floor(previousIntelligence / 3));}
        return true;
    }

    private applyStatIncrease(stat: PlayerStat, amount: number): boolean {
        if (stat === 'vitality') {this.vitality += amount;} else if (stat === 'toughness') {this.toughness += amount;}
        else if (stat === 'strength') {this.strength += amount;} else if (stat === 'agility') {this.agility += amount;}
        else if (stat === 'connection') {this.connection += amount;} else if (stat === 'intelligence') {this.intelligence += amount;}
        else {return false;}
        return true;
    }

    private levelUp(): void {
        if (this.level >= levelConfig.maxLevel) {return;}
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.skillPoints += levelConfig.skillPointsPerLevel;
        this.xpToNextLevel = getXpForLevel(this.level + 1);
        this.updateStats();
        this.healToFull();
        this.mana = this.maxMana;
    }
}
