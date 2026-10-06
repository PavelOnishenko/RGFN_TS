import { QuestNode } from './QuestTypes.js';

export type ActiveMonsterObjective = {
    targetName: string;
    villageName?: string;
    remainingKills: number;
    mutations: string[];
};

export class QuestMonsterProgress {
    public markMonsterKillObjectives(node: QuestNode, normalizedMonsterName: string, isObjectiveKnown: (node: QuestNode) => boolean): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markMonsterKillObjectives(child, normalizedMonsterName, isObjectiveKnown) || changed;
        }

        if ((node.objectiveType !== 'eliminate' && node.objectiveType !== 'hunt') || node.children.length > 0 || node.isCompleted || !isObjectiveKnown(node)) {
            return changed;
        }

        const objectiveMonster = node.objectiveData?.monster?.targetName
            ?? node.entities.find((entity) => entity.type === 'monster')?.text;

        if (!objectiveMonster || objectiveMonster.trim().toLocaleLowerCase() !== normalizedMonsterName) {
            return changed;
        }

        const objectiveData = node.objectiveData ?? {};
        const monsterData = objectiveData.monster ?? { targetName: objectiveMonster, requiredKills: 1 };
        const currentKills = Math.max(0, (monsterData as { currentKills?: number }).currentKills ?? 0);
        const requiredKills = Math.max(1, monsterData.requiredKills ?? 1);
        const nextKills = Math.min(requiredKills, currentKills + 1);
        const nextMonsterData = { ...monsterData, currentKills: nextKills };

        node.objectiveData = { ...objectiveData, monster: nextMonsterData };
        if (nextKills >= requiredKills) {
            node.isCompleted = true;
        }

        return true;
    }

    public collectActiveMonsterObjectives(node: QuestNode, objectives: ActiveMonsterObjective[], isObjectiveKnown: (node: QuestNode) => boolean): void {
        node.children.forEach((child) => this.collectActiveMonsterObjectives(child, objectives, isObjectiveKnown));

        if ((node.objectiveType !== 'eliminate' && node.objectiveType !== 'hunt') || node.children.length > 0 || node.isCompleted || !isObjectiveKnown(node)) {
            return;
        }

        const targetName = node.objectiveData?.monster?.targetName
            ?? node.entities.find((entity) => entity.type === 'monster')?.text;

        if (!targetName) {
            return;
        }

        const requiredKills = Math.max(1, node.objectiveData?.monster?.requiredKills ?? 1);
        const currentKills = Math.max(0, (node.objectiveData?.monster as { currentKills?: number } | undefined)?.currentKills ?? 0);
        const remainingKills = requiredKills - currentKills;
        if (remainingKills <= 0) {
            return;
        }

        objectives.push({ targetName, villageName: node.objectiveData?.monster?.villageName, remainingKills, mutations: node.objectiveData?.monster?.mutations ?? [] });
    }
}
