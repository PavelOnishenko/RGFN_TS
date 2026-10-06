import { QuestNode } from './QuestTypes.js';

export function collectQuestPreorderNodes(root: QuestNode): QuestNode[] {
    const nodes: QuestNode[] = [];
    const visit = (node: QuestNode): void => {
        nodes.push(node);
        node.children.forEach((child) => visit(child));
    };
    visit(root);
    return nodes;
}

export function resolveKnownQuestCutoffIndex(preorderNodes: QuestNode[]): number {
    const firstIncompleteLeafIndex = preorderNodes.findIndex((node) => !node.isCompleted && node.children.length === 0);
    if (firstIncompleteLeafIndex >= 0) {
        return firstIncompleteLeafIndex;
    }
    const firstIncompleteIndex = preorderNodes.findIndex((node) => !node.isCompleted);
    if (firstIncompleteIndex >= 0) {
        return firstIncompleteIndex;
    }
    return preorderNodes.length - 1;
}

export function collectKnownQuestNodes(root: QuestNode): Set<QuestNode> {
    const preorderNodes = collectQuestPreorderNodes(root);
    const cutoffIndex = resolveKnownQuestCutoffIndex(preorderNodes);
    const knownNodes = new Set<QuestNode>();
    preorderNodes.forEach((node, index) => {
        if (node.isCompleted || index <= cutoffIndex) {
            knownNodes.add(node);
        }
    });
    return knownNodes;
}
