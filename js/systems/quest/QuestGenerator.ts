import QuestLeafFactory from './generation/QuestLeafFactory.js';
import QuestPackService from './generation/QuestPackService.js';
import { DefaultQuestRandom, QuestRandom } from './generation/QuestRandom.js';
import { QuestNode, QuestRewardMetadata } from './QuestTypes.js';
import { theme } from '../../config/ThemeConfig.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { WorldVillageDirectionHint } from '../world/worldMap/WorldMap.js';

type GenerationContext = { depth: number; idPrefix: string };
type QuestGeneratorDeps = {
    packService?: QuestPackService;
    random?: QuestRandom;
    nearbyVillagesProvider?: (villageName: string, maxDistanceCells: number) => Array<{ name: string; distanceCells: number }>;
    villageDirectionHintProvider?: (villageName: string) => WorldVillageDirectionHint;
};

const DEFAULT_DESCRIPTION = 'Complete every branch of this quest tree to prove your character can end the darkness over the region.';
const DEFAULT_CONDITION = 'All child objectives are completed.';
const BRANCH_TITLES = ['Purge Route', 'Supply Route', 'Witness Route', 'Ritual Route', 'Signal Route'];

export default class QuestGenerator {
    private readonly packService: QuestPackService;
    private readonly random: QuestRandom;
    private readonly leafFactory: QuestLeafFactory;
    private readonly nearbyVillagesProvider?: (villageName: string, maxDistanceCells: number) => Array<{ name: string; distanceCells: number }>;
    private readonly villageDirectionHintProvider?: (villageName: string) => WorldVillageDirectionHint;

    constructor(deps: QuestGeneratorDeps = {}) {
        this.packService = deps.packService ?? new QuestPackService();
        this.random = deps.random ?? new DefaultQuestRandom();
        this.leafFactory = new QuestLeafFactory(this.packService, this.random);
        this.nearbyVillagesProvider = deps.nearbyVillagesProvider;
        this.villageDirectionHintProvider = deps.villageDirectionHintProvider;
    }

    public async generateMainQuest(): Promise<QuestNode> {
        const title = await this.packService.generateName('mainQuest', theme.quest.nameGeneration.maxWordsByDomain.mainQuest);
        const children = await this.generateChildren();
        return this.node('main', title.text, DEFAULT_DESCRIPTION, DEFAULT_CONDITION, children);
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public async generateSideQuest(id: string, giverNpcName: string, giverVillageName: string): Promise<QuestNode> {
        const rootId = id.trim();
        const giverName = giverNpcName.trim();
        const villageName = giverVillageName.trim();
        const maxVillageDistanceCells = Math.max(1, Math.floor(balanceConfig.quest?.sideQuestMaxVillageDistanceCells ?? 8));
        const nearbyVillages = (this.nearbyVillagesProvider?.(villageName, maxVillageDistanceCells) ?? [])
            .filter((entry) => entry.name.trim().length > 0 && entry.distanceCells <= maxVillageDistanceCells)
            .map((entry) => entry.name.trim());
        const allowedVillages = Array.from(new Set([villageName, ...nearbyVillages]));
        const villageDirectionHints = allowedVillages.reduce<Record<string, WorldVillageDirectionHint>>((acc, name) => {
            if (!this.villageDirectionHintProvider) {
                return acc;
            }
            const hint = this.villageDirectionHintProvider(name);
            if (hint.exists) {
                acc[name.trim().toLocaleLowerCase()] = hint;
            }
            return acc;
        }, {});
        const leaf = await this.leafFactory.createSide(`${rootId}.1`, {
            villageName,
            giverNpcName: giverName,
            nearbyVillageNames: nearbyVillages,
            villageDirectionHints,
        });
        const rewardMetadata = this.generateSideQuestRewardMetadata();
        return this.createSideQuestRootNode(rootId, giverName, villageName, leaf, rewardMetadata);
    }

    private async generateChildren(): Promise<QuestNode[]> {
        const branchCount = this.random.nextInt(1, 3);
        return Promise.all(Array.from({ length: branchCount }, (_, index) => this.generateNode({ depth: 1, idPrefix: `main.${index + 1}` })));
    }

    private async generateNode(context: GenerationContext): Promise<QuestNode> {
        if (context.depth >= 3 || !this.random.nextBool(0.58)) {
            return this.leafFactory.create(context.idPrefix);
        }
        const children = await this.generateBranchChildren(context);
        return this.node(
            context.idPrefix,
            `${this.random.pick(BRANCH_TITLES)} ${context.depth}`,
            'A composite objective. All listed subtasks must be completed.',
            'Each subtask in this branch is completed.',
            children,
        );
    }

    private async generateBranchChildren(context: GenerationContext): Promise<QuestNode[]> {
        const childCount = this.random.nextInt(2, 3);
        const builders = Array.from({ length: childCount }, (_, index) => (
            this.generateNode({ depth: context.depth + 1, idPrefix: `${context.idPrefix}.${index + 1}` })
        ));
        return Promise.all(builders);
    }

    private node = (id: string, title: string, description: string, conditionText: string, children: QuestNode[]): QuestNode => ({
        id,
        title,
        description,
        conditionText,
        objectiveType: 'scout',
        entities: [],
        children,
    });

    private generateSideQuestRewardMetadata(): QuestRewardMetadata {
        const xp = this.random.nextInt(12, 30);
        const gold = this.random.nextInt(10, 45);
        const itemName = this.random.pick(['Repair Kit', 'Hunter Tonic', 'Scout Charm', 'Trail Rations']);
        return { xp, gold, itemName, requiresTurnIn: true };
    }

    private renderRewardText = (rewardMetadata: QuestRewardMetadata): string =>
        `${rewardMetadata.xp} XP, ${rewardMetadata.gold}g, ${rewardMetadata.itemName}`;

    private createSideQuestRootNode = (id: string, giverNpcName: string, giverVillageName: string, leaf: QuestNode, rewardMetadata: QuestRewardMetadata): QuestNode => ({
        id, objectiveType: 'scout', entities: [], children: [leaf], track: 'side', giverNpcName, giverVillageName, rewardMetadata, status: 'available',
        title: `${giverNpcName}'s Request`,
        description: `Assist ${giverNpcName} with a local task in ${giverVillageName}.`,
        conditionText: 'Complete the listed task and return to the quest giver.',
        reward: this.renderRewardText(rewardMetadata),
    });
}
