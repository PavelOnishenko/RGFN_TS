import { QuestNode } from '../QuestTypes.js';
import { collectQuestPreorderNodes, resolveKnownQuestCutoffIndex } from '../QuestKnowledge.js';

const DEFAULT_DESCRIPTION = 'Complete every branch of this quest tree to prove your character can end the darkness over the region.';
const DEFAULT_CONDITION = 'All child objectives are completed.';
const DEFAULT_BRANCH_DESCRIPTION = 'A composite objective. All listed subtasks must be completed.';
const DEFAULT_BRANCH_CONDITION = 'Each subtask in this branch is completed.';
const DEFAULT_DESCRIPTIONS = new Set([DEFAULT_DESCRIPTION, DEFAULT_BRANCH_DESCRIPTION]);
const DEFAULT_CONDITIONS = new Set([DEFAULT_CONDITION, DEFAULT_BRANCH_CONDITION]);

type QuestUiMarkupBuilderDependencies = {
    isKnownOnlyEnabled: () => boolean;
};

export default class QuestUiMarkupBuilder {
    private readonly isKnownOnlyEnabled: () => boolean;

    constructor(dependencies: QuestUiMarkupBuilderDependencies) {
        this.isKnownOnlyEnabled = dependencies.isKnownOnlyEnabled;
    }

    public buildQuestTreeMarkup(quest: QuestNode): string {
        const preorderNodes = collectQuestPreorderNodes(quest);
        const maxVisiblePreorderIndex = this.resolveKnownQuestCutoff(preorderNodes);
        return this.buildQuestTreeMarkupNode(quest, 0, preorderNodes, maxVisiblePreorderIndex) ?? '';
    }

    private buildQuestTreeMarkupNode(quest: QuestNode, depth: number, preorderNodes: QuestNode[], maxVisiblePreorderIndex: number): string | null {
        const childMarkup = quest.children
            .map((child) => this.buildQuestTreeMarkupNode(child, depth + 1, preorderNodes, maxVisiblePreorderIndex))
            .filter((markup): markup is string => markup !== null)
            .join('');
        const listClass = depth === 0 ? 'quest-tree-root' : 'quest-tree-children';
        const hasVisibleChildren = childMarkup.length > 0;
        const childList = hasVisibleChildren ? `<ul class="${listClass}">${childMarkup}</ul>` : '';
        const completionClass = quest.isCompleted ? ' is-completed' : '';
        const selfNode = `<li class="quest-node${completionClass}" data-depth="${depth}">${this.nodeMarkup(quest)}${childList}</li>`;
        const shouldShowNode = this.shouldShowNode(quest, preorderNodes, maxVisiblePreorderIndex) || hasVisibleChildren;
        if (!shouldShowNode) {
            return null;
        }

        return depth === 0 ? `<ul class="quest-tree-root">${selfNode}</ul>` : selfNode;
    }

    private shouldShowNode(quest: QuestNode, preorderNodes: QuestNode[], maxVisiblePreorderIndex: number): boolean {
        if (!this.isKnownOnlyEnabled()) {
            return true;
        }
        if (quest.isCompleted) {
            return true;
        }

        const questPreorderIndex = preorderNodes.indexOf(quest);
        return questPreorderIndex >= 0 && questPreorderIndex <= maxVisiblePreorderIndex;
    }

    private resolveKnownQuestCutoff(preorderNodes: QuestNode[]): number {
        if (!this.isKnownOnlyEnabled()) {
            return preorderNodes.length - 1;
        }
        return resolveKnownQuestCutoffIndex(preorderNodes);
    }

    private nodeMarkup = (quest: QuestNode): string => `${this.titleMarkup(quest)}${this.descriptionMarkup(quest)}${this.conditionMarkup(quest)}`;

    private titleMarkup(quest: QuestNode): string {
        const completionPrefix = quest.isCompleted ? '<span class="quest-node-check" aria-hidden="true">✓ </span>' : '';
        return `<div class="quest-node-title">${completionPrefix}${this.formatText(quest.title, quest)}</div>`;
    }

    private descriptionMarkup = (quest: QuestNode): string => this.shouldRenderDescription(quest) ? `<div class="quest-node-description">${this.formatText(quest.description, quest)}</div>` : '';

    private conditionMarkup = (quest: QuestNode): string => this.shouldRenderCondition(quest) ? `<div class="quest-node-condition">Condition: ${this.formatText(quest.conditionText, quest)}</div>` : '';

    private shouldRenderDescription = (quest: QuestNode): boolean => quest.description.trim().length > 0 && !DEFAULT_DESCRIPTIONS.has(quest.description);

    private shouldRenderCondition = (quest: QuestNode): boolean => quest.conditionText.trim().length > 0 && !DEFAULT_CONDITIONS.has(quest.conditionText);

    private formatText(text: string, quest: QuestNode): string {
        let markup = this.escapeHtml(text);
        const entities = [...(quest.entities ?? [])].sort((a, b) => b.text.length - a.text.length);

        for (const entity of entities) {
            const escapedText = this.escapeHtml(entity.text);
            const className = entity.type === 'location' ? 'quest-entity-name location' : entity.type === 'item' ? 'quest-entity-name item' : 'quest-entity-name person';
            const replacement = entity.type === 'location'
                ? `<button type="button" class="${className}" data-location-name="${escapedText}">${escapedText}</button>`
                : `<span class="${className}">${escapedText}</span>`;
            markup = markup.split(escapedText).join(replacement);
        }

        return markup;
    }

    private escapeHtml = (text: string): string => text
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#39;');
}
