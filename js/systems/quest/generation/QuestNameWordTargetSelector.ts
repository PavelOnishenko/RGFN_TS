import { theme } from '../../../config/ThemeConfig.js';
import { QuestRandom } from './QuestRandom.js';
import { QuestNameDomain } from '../QuestTypes.js';
import { LengthWeightMap } from './QuestPackTypes.js';

type WeightedTarget = { words: number; weight: number };

export class QuestNameWordTargetSelector {
    constructor(private readonly random: QuestRandom) {}

    public pickWordTarget(domain: QuestNameDomain, maxWords: number): number {
        const cap = Math.max(1, maxWords);
        const configuredWeights = theme.quest.nameGeneration.wordLengthWeightsByDomain[domain] as LengthWeightMap | undefined;
        const weightedTargets = this.resolveLengthWeights(configuredWeights, cap);
        const totalWeight = weightedTargets.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = this.random.nextInt(1, totalWeight);
        for (const entry of weightedTargets) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.words;
            }
        }
        return Math.min(2, cap);
    }

    private resolveLengthWeights(weights: LengthWeightMap | undefined, cap: number): WeightedTarget[] {
        if (!weights) {
            return [{ words: 1, weight: 1 }];
        }
        const entries = (Object.entries(weights) as Array<[string, number]>)
            .map(([length, weight]) => ({ words: Number(length), weight }))
            .filter((entry) => Number.isInteger(entry.words)
                && entry.words >= 1
                && entry.words <= cap
                && entry.weight > 0);
        if (entries.length > 0) {
            return entries;
        }
        return [{ words: 1, weight: 1 }];
    }
}
