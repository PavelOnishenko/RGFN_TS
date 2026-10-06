import { QuestNode } from './QuestTypes.js';

export class QuestTraversalCompletion {
    public recomputeCompletion(node: QuestNode): boolean {
        if (node.children.length === 0) {
            node.isCompleted = Boolean(node.isCompleted);
            return node.isCompleted;
        }

        const allChildrenCompleted = node.children.every((child) => this.recomputeCompletion(child));
        node.isCompleted = allChildrenCompleted;
        return allChildrenCompleted;
    }
}
