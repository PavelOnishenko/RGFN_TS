import { QuestRewardMetadata } from './QuestTypes.js';

const XP_REWARD_PATTERN = /(\d+)\s*xp/i;
const GOLD_REWARD_PATTERN = /(\d+)\s*g\b/i;

const parseRewardValue = (text: string, pattern: RegExp): number | null => {
    const match = text.match(pattern);
    if (!match) {
        return null;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isNaN(value) ? null : value;
};

const parseLegacyRewardText = (rewardText: string): QuestRewardMetadata | null => {
    const xp = parseRewardValue(rewardText, XP_REWARD_PATTERN);
    const gold = parseRewardValue(rewardText, GOLD_REWARD_PATTERN);
    if (xp === null || gold === null) {
        return null;
    }
    const itemName = rewardText.split(',').slice(2).join(',').trim() || 'Unknown reward item';
    return { xp, gold, itemName, requiresTurnIn: true };
};

export const resolveSideQuestRewardMetadata = (rewardMetadata: QuestRewardMetadata | undefined, rewardText: string | undefined): QuestRewardMetadata | null => {
    if (rewardMetadata) {
        return rewardMetadata;
    }
    if (!rewardText) {
        return null;
    }
    return parseLegacyRewardText(rewardText);
};
