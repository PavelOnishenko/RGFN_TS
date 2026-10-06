/**
 * Balance Configuration
 * Centralized location for all game balance parameters.
 */

import { creatureArchetypes } from './creatureArchetypes.js';
import { worldMapBalance } from './worldMapBalance.js';
import { playerBalance, enemyBalance } from './playerEnemyBalance.js';
import { statsBalance, levelingBalance, combatBalance } from './progressionBalance.js';
import { itemBalance, encounterBalance } from './itemsEncountersBalance.js';
import { npcTasksBalance } from './npcTasksBalance.js';

export const balanceConfig = {
    worldMap: worldMapBalance,
    quest: {
        sideQuestMaxVillageDistanceCells: 8,
        sideQuestNearbyRosterDistanceCells: 4,
        sideQuestVillagerOfferChance: 0.5,
        sideQuestMaxOffersPerVillager: 5,
        monsterObjectiveEncounterMaxDistanceCells: 7,
        monsterObjectiveEncounterChance: 0.35,
    },
    survival: {
        awakeHoursPerDay: 16,
        requiredSleepHours: 8,
        maxFatigue: 100,
        cautionFatigueThreshold: 60,
        highFatigueThreshold: 80,
        villageSleepFatigueRecovery: 90,
        wildSleepFatigueRecovery: 65,
        wildSleepAmbushChance: 0.35,
        wildSleepAmbushHpLoss: 2,
        wildSleepAmbushManaLoss: 2,
        doctorHealCostGold: 4,
        innMealCostGold: 2,
        innMealHpRecovery: 2,
        innMealManaRecovery: 2,
        innRoomCostGold: 6,
        villageWaitMinutes: 12 * 60,
        villageWaitHpRecovery: 1,
        villageWaitManaRecovery: 1,
    },
    player: playerBalance,
    enemies: enemyBalance,
    stats: statsBalance,
    leveling: levelingBalance,
    combat: combatBalance,
    items: itemBalance,
    creatureArchetypes,
    encounters: encounterBalance,
    npcTasks: npcTasksBalance,
};
