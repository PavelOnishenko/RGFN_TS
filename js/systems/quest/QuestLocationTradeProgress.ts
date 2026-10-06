import { QuestNode } from './QuestTypes.js';

const LOCATION_OBJECTIVES = new Set(['travel', 'scout']);

export class QuestLocationTradeProgress {
    public markLocationAndDeliveryObjectives(
        node: QuestNode,
        normalizedLocation: string,
        carriedItems: Set<string>,
        isObjectiveKnown: (node: QuestNode) => boolean,
    ): boolean {
        const locationChanged = this.markLocationObjectives(node, normalizedLocation, isObjectiveKnown);
        const deliveryChanged = this.markDeliverObjectives(node, normalizedLocation, carriedItems, isObjectiveKnown);
        return locationChanged || deliveryChanged;
    }

    public markBarterAndPickupObjectives(
        node: QuestNode,
        normalizedTrader: string,
        normalizedItem: string,
        normalizedVillage: string,
        isObjectiveKnown: (node: QuestNode) => boolean,
    ): boolean {
        const barterChanged = this.markBarterObjectives(node, normalizedTrader, normalizedItem, isObjectiveKnown);
        const pickupChanged = this.markDeliverPickupObjectives(node, normalizedTrader, normalizedItem, normalizedVillage, isObjectiveKnown);
        return barterChanged || pickupChanged;
    }

    private markDeliverObjectives(node: QuestNode, normalizedLocation: string, carriedItems: Set<string>, isObjectiveKnown: (node: QuestNode) => boolean): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markDeliverObjectives(child, normalizedLocation, carriedItems, isObjectiveKnown) || changed;
        }

        if (node.objectiveType !== 'deliver' || node.children.length > 0 || node.isCompleted || !isObjectiveKnown(node)) {
            return changed;
        }

        const deliverData = node.objectiveData?.deliver;
        if (!deliverData?.isPickedUp) {
            return changed;
        }

        const destinationMatches = deliverData.destinationVillage.trim().toLocaleLowerCase() === normalizedLocation;
        const carryingItem = carriedItems.has(deliverData.itemName.trim().toLocaleLowerCase());
        if (!destinationMatches || !carryingItem) {
            return changed;
        }

        node.isCompleted = true;
        return true;
    }

    private markDeliverPickupObjectives(
        node: QuestNode,
        normalizedTrader: string,
        normalizedItem: string,
        normalizedVillage: string,
        isObjectiveKnown: (node: QuestNode) => boolean,
    ): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markDeliverPickupObjectives(child, normalizedTrader, normalizedItem, normalizedVillage, isObjectiveKnown) || changed;
        }

        if (node.objectiveType !== 'deliver' || node.children.length > 0 || !isObjectiveKnown(node)) {
            return changed;
        }

        const deliverData = node.objectiveData?.deliver;
        if (!deliverData || deliverData.isPickedUp) {
            return changed;
        }

        const traderMatches = deliverData.sourceTrader.trim().toLocaleLowerCase() === normalizedTrader;
        const itemMatches = deliverData.itemName.trim().toLocaleLowerCase() === normalizedItem;
        const villageMatches = deliverData.sourceVillage.trim().toLocaleLowerCase() === normalizedVillage;
        if (!traderMatches || !itemMatches || !villageMatches) {
            return changed;
        }

        deliverData.isPickedUp = true;
        return true;
    }

    private markLocationObjectives(node: QuestNode, normalizedLocation: string, isObjectiveKnown: (node: QuestNode) => boolean): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markLocationObjectives(child, normalizedLocation, isObjectiveKnown) || changed;
        }

        if (!LOCATION_OBJECTIVES.has(node.objectiveType) || node.children.length > 0 || !isObjectiveKnown(node)) {
            return changed;
        }

        const locationEntity = node.entities.find((entity) => entity.type === 'location');
        if (!locationEntity || locationEntity.text.trim().toLocaleLowerCase() !== normalizedLocation || node.isCompleted) {
            return changed;
        }

        node.isCompleted = true;
        return true;
    }

    private markBarterObjectives(node: QuestNode, normalizedTrader: string, normalizedItem: string, isObjectiveKnown: (node: QuestNode) => boolean): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markBarterObjectives(child, normalizedTrader, normalizedItem, isObjectiveKnown) || changed;
        }

        if (node.objectiveType !== 'barter' || node.children.length > 0 || node.isCompleted || !isObjectiveKnown(node)) {
            return changed;
        }

        const trader = node.entities.find((entity) => entity.type === 'person');
        const item = node.entities.find((entity) => entity.type === 'item');
        if (!trader || !item) {
            return changed;
        }

        const traderMatches = trader.text.trim().toLocaleLowerCase() === normalizedTrader;
        const itemMatches = item.text.trim().toLocaleLowerCase() === normalizedItem;
        if (!traderMatches || !itemMatches) {
            return changed;
        }

        node.isCompleted = true;
        return true;
    }
}
