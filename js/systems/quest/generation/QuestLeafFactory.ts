/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning */
import QuestPackService from './QuestPackService.js';
import { QuestRandom } from './QuestRandom.js';
import { theme } from '../../../config/ThemeConfig.js';
import { DeliverObjectiveData, GeneratedName, QuestNameDomain, QuestNode, QuestObjectiveType } from '../QuestTypes.js';
import QuestLeafContentBuilder from './QuestLeafContentBuilder.js';
import { WorldVillageDirectionHint } from '../../world/worldMap/WorldMap.js';
type SideQuestConstraints = {
    villageName?: string;
    giverNpcName?: string;
    nearbyVillageNames?: string[];
    villageDirectionHints?: Record<string, WorldVillageDirectionHint>;
};
type LeafGenerationContext = {
    localVillageName?: string;
    localNpcName?: string;
    nearbyVillageNames?: string[];
    villageDirectionHints?: Record<string, WorldVillageDirectionHint>;
};

const MAIN_LEAF_TYPES: QuestObjectiveType[] = ['eliminate', 'deliver', 'travel', 'barter', 'scout', 'hunt', 'recover', 'escort', 'defend']; const SIDE_ONLY_LEAF_TYPES: QuestObjectiveType[] = ['localDelivery', 'gather', 'repair', 'patrol'];
const SIDE_LEAF_TYPES: QuestObjectiveType[] = [...MAIN_LEAF_TYPES, ...SIDE_ONLY_LEAF_TYPES];
const REPAIR_STRUCTURES = ['Well Pump', 'Palisade Gate', 'Watchtower Winch', 'Granary Roof'];
const GATHER_ITEMS = ['Medicinal Herbs', 'Iron Scrap', 'Lantern Oil', 'Timber Bundles'];
const LOCAL_DELIVERY_ITEMS = ['Ration Crate', 'Treated Bandages', 'Signal Flare Kit', 'Courier Satchel'];
const PATROL_CHECKPOINTS = ['North Gate', 'Market Square', 'River Watch', 'Old Shrine', 'South Wall'];

export default class QuestLeafFactory {
    private readonly packService: QuestPackService;
    private readonly random: QuestRandom;
    private readonly maxWordsByDomain = theme.quest.nameGeneration.maxWordsByDomain;
    private readonly contentBuilder: QuestLeafContentBuilder;

    constructor(packService: QuestPackService, random: QuestRandom) {
        this.packService = packService;
        this.random = random;
        this.contentBuilder = new QuestLeafContentBuilder(random);
    }

    public async create(id: string): Promise<QuestNode> {
        const type = this.random.pick(MAIN_LEAF_TYPES);
        return this.createFromType(id, type);
    }

    public async createSide(id: string, constraints: SideQuestConstraints = {}): Promise<QuestNode> {
        const type = this.random.pick(SIDE_LEAF_TYPES);
        const nearbyVillageNames = (constraints.nearbyVillageNames ?? [])
            .map((name) => name.trim())
            .filter((name) => name.length > 0 && name.toLocaleLowerCase() !== constraints.villageName?.trim().toLocaleLowerCase());
        const context: LeafGenerationContext = {
            localVillageName: constraints.villageName?.trim() || undefined,
            localNpcName: constraints.giverNpcName?.trim() || undefined,
            nearbyVillageNames,
            villageDirectionHints: constraints.villageDirectionHints,
        };
        return this.createFromType(id, type, context);
    }

    private createFromType(id: string, type: QuestObjectiveType, context?: LeafGenerationContext): Promise<QuestNode> {
        if (type === 'eliminate') { return this.createEliminateNode(id, context); }
        if (type === 'deliver') { return this.createDeliverNode(id, context); }
        if (type === 'travel') { return this.createTravelNode(id, context); }
        if (type === 'barter') { return this.createBarterNode(id, context); }
        if (type === 'scout') { return this.createScoutNode(id, context); }
        if (type === 'hunt') { return this.createHuntNode(id, context); }
        if (type === 'recover') { return this.createRecoverNode(id, context); }
        if (type === 'escort') { return this.createEscortNode(id, context); }
        if (type === 'defend') { return this.createDefendNode(id, context); }
        if (type === 'localDelivery') { return this.createLocalDeliveryNode(id, context); }
        if (type === 'gather') { return this.createGatherNode(id, context); }
        if (type === 'repair') { return this.createRepairNode(id, context); }
        return this.createPatrolNode(id, context);
    }

    private async createEliminateNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const target = await this.generateName('monster');
        const amount = this.random.nextInt(1, 4);
        const location = await this.resolveVillage(context);
        const locationLabel = this.withVillageHint(location.text, context);
        const where = ` near ${locationLabel}`;
        const mutatedFrom = this.contentBuilder.randomMutatedSpecies();
        const mutations = this.contentBuilder.randomMutations(this.random.nextBool(0.5) ? 2 : 3);
        const details = `Origin: mutated from ${mutatedFrom}. Traits observed: ${mutations.join(', ')}.`;
        return this.contentBuilder.node(
            id,
            `Purge ${target.text}${amount > 1 ? ' Pack' : ''}`,
            `${this.contentBuilder.removeText(amount, target, where)} ${details}`,
            this.contentBuilder.killText(amount, target, where),
            'eliminate',
            this.contentBuilder.entities(target, location),
            { monster: { targetName: target.text, requiredKills: amount, villageName: location.text, mutations, mutatedFrom } },
        );
    }

    private async createDeliverNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const artifact = await this.generateName('artifact');
        const sourceTrader = await this.resolveTrader(context);
        const sourceVillage = await this.resolveVillage(context);
        const destination = await this.resolveDestination(sourceVillage, context);
        const objectiveData: DeliverObjectiveData = {
            sourceVillage: sourceVillage.text,
            sourceTrader: sourceTrader.text,
            destinationVillage: destination.text,
            itemName: artifact.text,
        };
        const sourceVillageLabel = this.withVillageHint(sourceVillage.text, context);
        const destinationLabel = this.withVillageHint(destination.text, context);
        const description = `Acquire ${this.contentBuilder.label(artifact)} from ${sourceTrader.text} in ${sourceVillageLabel}, then carry it to ${destinationLabel}.`;
        const condition = `Reach ${destinationLabel} while carrying ${this.contentBuilder.label(artifact)} obtained from ${sourceTrader.text} in ${sourceVillageLabel}.`;
        return this.contentBuilder.node(
            id,
            `Courier: ${artifact.text}`,
            description,
            condition,
            'deliver',
            this.contentBuilder.entities(artifact, sourceTrader, sourceVillage, destination),
            { deliver: objectiveData },
        );
    }

    private async createTravelNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const destination = await this.resolveVillage(context);
        const destinationLabel = this.withVillageHint(destination.text, context);
        return this.contentBuilder.node(
            id,
            `Scout ${destination.text}`,
            `Travel to ${destinationLabel} and secure the path.`,
            `Enter ${destinationLabel}.`,
            'travel',
            this.contentBuilder.entities(destination),
        );
    }

    private async createBarterNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const trader = await this.resolveTrader(context);
        const artifact = await this.generateName('artifact');
        return this.contentBuilder.node(
            id,
            `Barter with ${trader.text}`,
            `Negotiate with ${trader.text} and exchange for ${this.contentBuilder.label(artifact)}.`,
            `Complete one barter deal and obtain ${this.contentBuilder.label(artifact)}.`,
            'barter',
            this.contentBuilder.entities(trader, artifact),
        );
    }

    private async createScoutNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const destination = await this.resolveVillage(context);
        const destinationLabel = this.withVillageHint(destination.text, context);
        return this.contentBuilder.node(
            id,
            `Investigate ${destination.text}`,
            `Inspect tracks, ruins, and anomalies around ${destinationLabel}.`,
            `Finish one scouting investigation at ${destinationLabel}.`,
            'scout',
            this.contentBuilder.entities(destination),
        );
    }

    private async createHuntNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const profile = await this.contentBuilder.rareMonsterProfile(() => this.generateName('monster'));
        const location = await this.resolveVillage(context);
        const locationLabel = this.withVillageHint(location.text, context);
        const details = `Origin: mutated from ${profile.mutatedFrom}. `
            + `Stats: ${profile.stats.join(', ')}. `
            + `Effects: ${profile.effects.join(', ')}. `
            + `Bonus: ${profile.bonus}.`;
        return this.contentBuilder.node(
            id,
            `Hunt ${profile.name.text}`,
            `Track ${profile.count} rare mutant target${profile.count > 1 ? 's' : ''} near ${locationLabel}. ${details}`,
            `Kill ${profile.count} ${this.contentBuilder.pluralLabel(profile.name, profile.count)} near ${locationLabel}.`,
            'hunt',
            this.contentBuilder.entities(profile.name, location),
            {
                monster: {
                    targetName: profile.name.text,
                    requiredKills: profile.count,
                    villageName: location.text,
                    mutations: profile.stats,
                    mutatedFrom: profile.mutatedFrom,
                },
            },
        );
    }

    private async createRecoverNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const artifact = await this.generateName('artifact');
        const location = await this.resolveVillage(context);
        const person = await this.resolveTrader(context);
        const locationLabel = this.withVillageHint(location.text, context);
        return this.contentBuilder.node(
            id,
            `Recover ${artifact.text}`,
            `Retrieve the ${this.contentBuilder.label(artifact)} from ${locationLabel} and extract intact.`,
            `Obtain ${this.contentBuilder.label(artifact)} at ${locationLabel}.`,
            'recover',
            this.contentBuilder.entities(artifact, location),
            {
                recover: {
                    itemName: artifact.text,
                    personName: person.text,
                    initialVillage: location.text,
                    currentVillage: location.text,
                    isPersonKnown: false,
                    hasFled: false,
                },
            },
        );
    }

    private async createEscortNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const character = await this.resolveTrader(context);
        const source = await this.resolveVillage(context);
        const destination = await this.resolveDestination(source, context);
        const sourceLabel = this.withVillageHint(source.text, context);
        const destinationLabel = this.withVillageHint(destination.text, context);
        return this.contentBuilder.node(
            id,
            `Escort ${character.text}`,
            `Find ${character.text} in ${sourceLabel}, ask them to join your group, then escort them safely to ${destinationLabel}.`,
            `Recruit ${character.text} in ${sourceLabel}, then arrive at ${destinationLabel} while ${character.text} is alive and still in your group.`,
            'escort',
            this.contentBuilder.entities(character, source, destination),
            { escort: { personName: character.text, sourceVillage: source.text, destinationVillage: destination.text } },
        );
    }

    private async createDefendNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const location = await this.resolveVillage(context);
        const artifact = await this.generateName('artifact');
        const contact = await this.resolveTrader(context);
        const durationDays = this.random.nextInt(3, 7);
        const locationLabel = this.withVillageHint(location.text, context);
        return this.contentBuilder.node(
            id,
            `Defend ${location.text}`,
            `${contact.text} asks you to hold ${locationLabel} until the ${this.contentBuilder.label(artifact)} is secured.`,
            `Speak with ${contact.text} in ${locationLabel}, then Prevent the fall of ${locationLabel} for ${durationDays} day${durationDays === 1 ? '' : 's'} while securing ${this.contentBuilder.label(artifact)}.`,
            'defend',
            this.contentBuilder.entities(location, artifact, contact),
            {
                defend: {
                    villageName: location.text,
                    artifactName: artifact.text,
                    contactName: contact.text,
                    durationDays,
                    timeRemainingMinutes: durationDays * 24 * 60,
                    isDefenseActive: false,
                    defenders: [],
                    fallenDefenderNames: [],
                    battleCooldownMinutes: 0,
                },
            },
        );
    }

    public async createLocalDeliveryNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const village = await this.resolveVillage(context);
        const sourceNpc = await this.resolveTrader(context);
        const recipient = await this.generateName('character');
        const itemName = this.random.pick(LOCAL_DELIVERY_ITEMS);
        return this.contentBuilder.node(
            id,
            `Local Delivery: ${itemName}`,
            `Collect ${itemName} from ${sourceNpc.text} and hand it to ${recipient.text} in ${village.text}.`,
            `Deliver ${itemName} to ${recipient.text} in ${village.text}.`,
            'localDelivery',
            this.contentBuilder.entities(sourceNpc, recipient, village, this.localName(itemName, 'artifact')),
            {
                localDelivery: { villageName: village.text, sourceNpcName: sourceNpc.text, recipientNpcName: recipient.text, itemName, isDelivered: false },
            },
        );
    }

    public async createGatherNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const village = await this.resolveVillage(context);
        const itemName = this.random.pick(GATHER_ITEMS);
        const requiredAmount = this.random.nextInt(2, 5);
        return this.contentBuilder.node(
            id,
            `Gather ${itemName}`,
            `Collect ${requiredAmount} bundles of ${itemName} for stores in ${village.text}.`,
            `Bring ${requiredAmount} ${itemName} to ${village.text}.`,
            'gather',
            this.contentBuilder.entities(village, this.localName(itemName, 'artifact')),
            {
                gather: { villageName: village.text, itemName, requiredAmount, currentAmount: 0 },
            },
        );
    }

    public async createRepairNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const village = await this.resolveVillage(context);
        const structureName = this.random.pick(REPAIR_STRUCTURES);
        const requiredMaterials = [this.random.pick(['Timber', 'Iron Nails', 'Resin', 'Rope']), this.random.pick(['Stone Slabs', 'Canvas', 'Pitch'])];
        return this.contentBuilder.node(
            id,
            `Repair ${structureName}`,
            `Use local supplies to repair the ${structureName} in ${village.text}.`,
            `Restore the ${structureName} in ${village.text}.`,
            'repair',
            this.contentBuilder.entities(village, this.localName(structureName, 'artifact')),
            {
                repair: { villageName: village.text, structureName, requiredMaterials, repairedMaterials: [], isRepaired: false },
            },
        );
    }

    public async createPatrolNode(id: string, context?: LeafGenerationContext): Promise<QuestNode> {
        const village = await this.resolveVillage(context);
        const checkpoints = this.pickUniqueStrings(PATROL_CHECKPOINTS, this.random.nextInt(2, 4));
        return this.contentBuilder.node(
            id,
            `Patrol ${village.text}`,
            `Sweep ${village.text} and report at checkpoints: ${checkpoints.join(', ')}.`,
            `Visit all patrol checkpoints in ${village.text}.`,
            'patrol',
            this.contentBuilder.entities(village, ...checkpoints.map((checkpoint) => this.localName(checkpoint, 'location'))),
            {
                patrol: { villageName: village.text, checkpoints, visitedCheckpoints: [], isPatrolComplete: false },
            },
        );
    }

    private generateName = (
        domain: 'location' | 'artifact' | 'character' | 'monster',
    ): Promise<GeneratedName> => this.packService.generateName(domain, this.maxWordsByDomain[domain]);

    private async resolveDestination(sourceVillage: GeneratedName, context?: LeafGenerationContext): Promise<GeneratedName> {
        const nearbyVillage = this.pickNearbyVillageExcluding(context, sourceVillage.text);
        if (nearbyVillage) {
            return this.localName(nearbyVillage, 'location');
        }
        if (context?.localVillageName && !context?.nearbyVillageNames?.length) {
            return sourceVillage;
        }
        let destination = await this.generateName('location');
        const source = sourceVillage.text.trim().toLocaleLowerCase();
        if (destination.text.trim().toLocaleLowerCase() === source) {
            destination = await this.generateName('location');
        }
        return destination;
    }

    private async resolveVillage(context?: LeafGenerationContext): Promise<GeneratedName> {
        const villagePool = this.buildVillagePool(context);
        if (villagePool.length === 1) {return this.localName(villagePool[0], 'location');}
        if (villagePool.length > 1) {return this.localName(this.random.pick(villagePool), 'location');}
        return this.generateName('location');
    }

    private async resolveTrader(context?: LeafGenerationContext): Promise<GeneratedName> {
        if (context?.localNpcName) {
            return this.localName(context.localNpcName, 'character');
        }
        return this.generateName('character');
    }

    private localName = (text: string, domain: QuestNameDomain): GeneratedName => ({ text, domain, sourceTypes: ['local-pattern'] });

    private buildVillagePool(context?: LeafGenerationContext): string[] {
        if (!context) {return [];}
        const local = context.localVillageName?.trim();
        const nearby = (context.nearbyVillageNames ?? []).map((name) => name.trim()).filter((name) => name.length > 0);
        return Array.from(new Set([...(local ? [local] : []), ...nearby]));
    }

    private pickNearbyVillageExcluding(context: LeafGenerationContext | undefined, excludedVillageName: string): string | null {
        const normalizedExcluded = excludedVillageName.trim().toLocaleLowerCase();
        const nearby = (context?.nearbyVillageNames ?? [])
            .map((name) => name.trim())
            .filter((name) => name.length > 0 && name.toLocaleLowerCase() !== normalizedExcluded);
        if (nearby.length === 0) {return null;}
        return this.random.pick(nearby);
    }

    private withVillageHint(villageName: string, context?: LeafGenerationContext): string {
        const hint = context?.villageDirectionHints?.[villageName.trim().toLocaleLowerCase()];
        if (!hint?.exists || !hint.direction || typeof hint.distanceCells !== 'number' || hint.distanceCells <= 0) {
            return villageName;
        }
        return `${villageName} (${hint.direction}, ${hint.distanceCells} cells)`;
    }
    private pickUniqueStrings(values: string[], count: number): string[] {
        const local = [...values];
        const selected: string[] = [];
        while (local.length > 0 && selected.length < count) {
            const choice = this.random.pick(local);
            selected.push(choice);
            const index = local.findIndex((entry) => entry === choice);
            if (index >= 0) {
                local.splice(index, 1);
            }
        }
        return selected;
    }
}
