/* eslint-disable style-guide/file-length-error, style-guide/function-length-error, style-guide/function-length-warning */
/* eslint-disable style-guide/rule17-comma-layout, style-guide/arrow-function-style */
import QuestProgressTracker from '../../systems/quest/QuestProgressTracker.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY } from '../../entities/Item.js';
import {
    DefendObjectiveData,
    DefendObjectiveDefender,
    EscortObjectiveData,
    QuestNode,
    QuestRewardMetadata,
    QuestStatus,
    RecoverObjectiveData,
} from '../../systems/quest/QuestTypes.js';
import QuestUiController from '../../systems/quest/ui/QuestUiController.js';
import QuestGenerator from '../../systems/quest/QuestGenerator.js';
import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Skeleton, { MonsterMutationTrait } from '../../entities/Skeleton.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { getDeveloperModeConfig } from '../../utils/DeveloperModeConfig.js';
import { collectKnownQuestNodes } from '../../systems/quest/QuestKnowledge.js';
import { assignMonsterBehaviorPool } from '../../systems/combat/MonsterBehaviorDirector.js';
import type { ActiveMonsterObjective } from '../../systems/quest/QuestMonsterProgress.js';

type QuestContractsReadyPayload = {
    barterContracts: Array<{
        traderName: string;
        itemName: string;
        sourceVillage?: string;
        destinationVillage?: string;
        contractType: 'barter' | 'deliver' | 'recover';
    }>;
    escortContracts: Array<{ personName: string; sourceVillage: string; destinationVillage: string }>;
    defendContracts: Array<{
        personName: string;
        villageName: string;
        artifactName: string;
        activeDefenderNames: string[];
        fallenDefenderNames: string[];
    }>;
};

export default class GameQuestRuntime {
    public activeQuest: QuestNode | null = null;
    public activeSideQuests: QuestNode[] = [];
    public questUiController: QuestUiController | null = null;
    public questProgressTracker: QuestProgressTracker | null = null;
    private onContractsUpdated: ((payload: QuestContractsReadyPayload) => void) | null = null;
    private pendingRecoverBattleNodeId: string | null = null;
    private worldMap: WorldMap | null = null;
    private readonly sideQuestOffersByNpc: Map<string, QuestNode[]> = new Map();
    private readonly maxSideQuestsPerVillager: number;

    public constructor(maxSideQuestsPerVillager: number = 2) {
        this.maxSideQuestsPerVillager = Math.max(1, Math.min(3, Math.floor(maxSideQuestsPerVillager)));
    }

    public async initialize(
        questGenerator: QuestGenerator,
        questUiController: QuestUiController,
        getSavedQuest: () => QuestNode | null,
        onContractsReady: (payload: QuestContractsReadyPayload) => void,
        worldMap: WorldMap,
    ): Promise<void> {
        const savedQuest = getSavedQuest();
        const quest = savedQuest ?? await questGenerator.generateMainQuest();
        this.activeQuest = quest;
        this.questUiController = questUiController;
        this.questProgressTracker = new QuestProgressTracker(quest);
        this.onContractsUpdated = onContractsReady;
        this.worldMap = worldMap;
        onContractsReady({
            barterContracts: this.collectBarterContracts(quest),
            escortContracts: this.collectEscortContracts(quest),
            defendContracts: this.collectDefendContracts(quest),
        });
        this.syncKnownQuestLocations();
        this.renderQuestUi();
        if (!savedQuest && getDeveloperModeConfig().questIntroEnabled) {
            questUiController.showIntro();
        }
    }

    public registerVillageSideQuestOffer(quest: QuestNode): boolean {
        if (!quest.id.trim()) {
            return false;
        }
        const giverNpcName = quest.giverNpcName?.trim();
        const giverVillageName = quest.giverVillageName?.trim();
        if (!giverNpcName || !giverVillageName) {
            return false;
        }
        const npcKey = this.getVillagerQuestKey(giverVillageName, giverNpcName);
        const offers = this.sideQuestOffersByNpc.get(npcKey) ?? [];
        if (offers.some((offer) => offer.id === quest.id) || this.activeSideQuests.some((activeQuest) => activeQuest.id === quest.id)) {
            return false;
        }
        if (offers.length >= this.maxSideQuestsPerVillager) {
            return false;
        }
        quest.track = 'side';
        quest.status = this.normalizeSideQuestStatus(quest.status);
        this.sideQuestOffersByNpc.set(npcKey, [...offers, quest]);
        this.renderQuestUi();
        return true;
    }

    public getVillageSideQuestOffers(villageName: string, npcName: string): QuestNode[] {
        const npcKey = this.getVillagerQuestKey(villageName, npcName);
        const offers = this.sideQuestOffersByNpc.get(npcKey) ?? [];
        return offers.map((quest) => ({ ...quest }));
    }

    public getVillageNpcActiveSideQuests(villageName: string, npcName: string): QuestNode[] {
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const normalizedNpc = npcName.trim().toLocaleLowerCase();
        return this.activeSideQuests
            .filter((quest) => quest.status !== 'completed')
            .filter((quest) => quest.giverVillageName?.trim().toLocaleLowerCase() === normalizedVillage)
            .filter((quest) => quest.giverNpcName?.trim().toLocaleLowerCase() === normalizedNpc)
            .map((quest) => ({ ...quest }));
    }

    public getActiveSideQuests(): QuestNode[] {
        return this.activeSideQuests
            .filter((quest) => quest.status !== 'completed')
            .map((quest) => ({ ...quest }));
    }

    public getKnownSideQuest(questId: string): QuestNode | null {
        const normalizedQuestId = questId.trim();
        if (!normalizedQuestId) {
            return null;
        }

        for (const offers of this.sideQuestOffersByNpc.values()) {
            const offer = offers.find((entry) => entry.id === normalizedQuestId);
            if (offer) {
                return { ...offer };
            }
        }

        const activeQuest = this.activeSideQuests.find((entry) => entry.id === normalizedQuestId);
        return activeQuest ? { ...activeQuest } : null;
    }

    public replaceKnownSideQuest(questId: string, replacement: QuestNode): boolean {
        const normalizedQuestId = questId.trim();
        if (!normalizedQuestId || !replacement.id.trim()) {
            return false;
        }

        for (const [npcKey, offers] of this.sideQuestOffersByNpc.entries()) {
            const offerIndex = offers.findIndex((entry) => entry.id === normalizedQuestId);
            if (offerIndex < 0) {
                continue;
            }
            offers[offerIndex] = replacement;
            this.sideQuestOffersByNpc.set(npcKey, offers);
            this.renderQuestUi();
            return true;
        }

        const activeIndex = this.activeSideQuests.findIndex((entry) => entry.id === normalizedQuestId);
        if (activeIndex < 0) {
            return false;
        }
        this.activeSideQuests[activeIndex] = replacement;
        this.renderQuestUi();
        return true;
    }

    public clearVillageSideQuestOffers(villageName: string): void {
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedVillage) {
            return;
        }
        for (const npcKey of this.sideQuestOffersByNpc.keys()) {
            if (!npcKey.startsWith(`${normalizedVillage}::`)) {
                continue;
            }
            this.sideQuestOffersByNpc.delete(npcKey);
        }
    }

    public acceptSideQuest(questId: string): { accepted: boolean; reason?: 'inactive' | 'not-found' | 'already-active' } {
        const normalizedQuestId = questId.trim();
        if (!normalizedQuestId) {
            return { accepted: false, reason: 'not-found' };
        }
        const existing = this.activeSideQuests.find((quest) => quest.id === normalizedQuestId);
        if (existing) {
            return { accepted: false, reason: 'already-active' };
        }

        for (const [npcKey, offers] of this.sideQuestOffersByNpc.entries()) {
            const offerIndex = offers.findIndex((offer) => offer.id === normalizedQuestId);
            if (offerIndex < 0) {
                continue;
            }
            const offer = offers[offerIndex];
            offer.status = 'active';
            offer.track = 'side';
            this.activeSideQuests.push(offer);
            offers.splice(offerIndex, 1);
            if (offers.length === 0) {
                this.sideQuestOffersByNpc.delete(npcKey);
            } else {
                this.sideQuestOffersByNpc.set(npcKey, offers);
            }
            this.renderQuestUi();
            return { accepted: true };
        }
        return { accepted: false, reason: 'not-found' };
    }

    public turnInSideQuest(
        questId: string,
        npcName: string,
        villageName: string,
    ): {
        turnedIn: boolean;
        reason?: 'inactive' | 'not-found' | 'wrong-giver' | 'not-ready' | 'already-completed';
        reward?: string;
        rewardMetadata?: QuestRewardMetadata;
    } {
        const normalizedQuestId = questId.trim();
        if (!normalizedQuestId) {
            return { turnedIn: false, reason: 'not-found' };
        }
        const quest = this.activeSideQuests.find((entry) => entry.id === normalizedQuestId);
        if (!quest) {
            return { turnedIn: false, reason: 'not-found' };
        }
        if (quest.status === 'completed') {
            return { turnedIn: false, reason: 'already-completed' };
        }
        if (quest.status !== 'readyToTurnIn') {
            return { turnedIn: false, reason: 'not-ready' };
        }
        if (!this.isMatchingQuestGiver(quest, npcName, villageName)) {
            return { turnedIn: false, reason: 'wrong-giver' };
        }
        quest.status = 'completed';
        quest.isCompleted = true;
        this.renderQuestUi();
        const rewardMetadata = quest.rewardMetadata ? { ...quest.rewardMetadata } : undefined;
        return { turnedIn: true, reward: quest.reward, rewardMetadata };
    }

    public markSideQuestReadyToTurnIn(questId: string): boolean {
        const quest = this.activeSideQuests.find((entry) => entry.id === questId.trim());
        if (!quest || quest.status === 'completed') {
            return false;
        }
        quest.status = 'readyToTurnIn';
        this.renderQuestUi();
        return true;
    }

    public recordLocationEntry(
        locationName: string,
        carriedItemNames: string[],
        onRecoveredItemFound?: (item: Item) => boolean,
    ): { changed: boolean; logs: string[] } {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return { changed: false, logs: [] };
        }
        const locationChanged = this.questProgressTracker.recordLocationEntryWithInventory(locationName, carriedItemNames);
        const sideQuestProgress = this.progressSideQuestsOnLocationEntry(locationName, carriedItemNames, onRecoveredItemFound);
        const escortChanged = this.resolveEscortArrival(locationName);
        if (!locationChanged && !sideQuestProgress.changed && !escortChanged) {
            return { changed: false, logs: sideQuestProgress.logs };
        }
        this.renderQuestUi();
        this.refreshContracts();
        return { changed: true, logs: sideQuestProgress.logs };
    }

    public getKnownQuestLocationNames(): string[] {
        const locationNames = new Set<string>();
        if (this.activeQuest) {
            this.collectKnownQuestLocationNames(this.activeQuest)
                .forEach((locationName) => locationNames.add(locationName));
        }
        this.getKnownSideQuestsForUi()
            .flatMap((quest) => this.collectQuestLocationNames(quest))
            .forEach((locationName) => locationNames.add(locationName));
        return Array.from(locationNames).sort((left, right) => left.localeCompare(right));
    }

    public recruitEscort(personName: string, villageName: string): 'joined' | 'inactive' | 'already-joined' | 'not-available' {
        if (!this.activeQuest || !this.questUiController) {
            return 'inactive';
        }

        const normalizedPerson = personName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedPerson || !normalizedVillage) {
            return 'not-available';
        }

        let result: 'joined' | 'already-joined' | 'not-available' = 'not-available';
        let didJoin = false;
        this.visitQuestNodes(this.activeQuest, (node) => {
            const escort = this.getRecruitableEscort(node);
            if (!escort || !this.matchesEscortRecruitTarget(escort, normalizedPerson, normalizedVillage)) {
                return;
            }
            if (escort.hasJoined) {
                result = 'already-joined';
                return;
            }
            escort.hasJoined = true;
            result = 'joined';
            didJoin = true;
        });

        if (didJoin) {
            this.questProgressTracker?.recomputeCompletion();
            this.renderQuestUi();
        }
        return result;
    }

    public revealRecoverHolder(villageName: string, npcName: string): { revealed: boolean; personName?: string; itemName?: string } {
        if (!this.activeQuest || !this.questUiController) {
            return { revealed: false };
        }

        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const normalizedNpc = npcName.trim().toLocaleLowerCase();
        if (!normalizedVillage || !normalizedNpc) {
            return { revealed: false };
        }

        let revealed: { revealed: boolean; personName?: string; itemName?: string } = { revealed: false };
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (revealed.revealed || node.objectiveType !== 'recover' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const recover = node.objectiveData?.recover;
            if (!recover || recover.isPersonKnown) {
                return;
            }
            if (recover.currentVillage.trim().toLocaleLowerCase() !== normalizedVillage) {
                return;
            }
            if (recover.personName.trim().toLocaleLowerCase() === normalizedNpc) {
                return;
            }
            recover.isPersonKnown = true;
            this.updateRecoverObjectiveText(node);
            this.refreshContracts();
            this.renderQuestUi();
            revealed = { revealed: true, personName: recover.personName, itemName: recover.itemName };
        });
        return revealed;
    }

    public startRecoverConfrontation(
        personName: string,
        villageName: string,
    ): { status: 'started' | 'inactive' | 'not-target' | 'not-ready'; enemies?: Skeleton[]; itemName?: string } {
        if (!this.activeQuest) {
            return { status: 'inactive' };
        }

        const normalizedPerson = personName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedPerson || !normalizedVillage) {
            return { status: 'not-target' };
        }

        let matchedNode: QuestNode | null = null;
        let matchedRecover: RecoverObjectiveData | null = null;
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (matchedRecover || node.objectiveType !== 'recover' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const recover = node.objectiveData?.recover;
            if (!recover) {
                return;
            }
            if (recover.personName.trim().toLocaleLowerCase() !== normalizedPerson) {
                return;
            }
            matchedNode = node;
            matchedRecover = recover;
        });
        if (!matchedNode || !matchedRecover) {
            return { status: 'not-target' };
        }
        if (!matchedRecover.isPersonKnown || matchedRecover.currentVillage.trim().toLocaleLowerCase() !== normalizedVillage) {
            return { status: 'not-ready' };
        }

        const profile = this.ensureRecoverEnemyProfile(matchedRecover);
        this.pendingRecoverBattleNodeId = matchedNode.id;
        return { status: 'started', enemies: [this.createQuestEnemy(this.toRecoverEnemyConfig(matchedRecover.personName, profile))], itemName: matchedRecover.itemName };
    }

    public resolveRecoverBattle(result: 'victory' | 'fled', worldMap: WorldMap, player: { addItemToInventory: (item: Item) => boolean }): string[] {
        if (!this.activeQuest || !this.pendingRecoverBattleNodeId) {
            return [];
        }

        const node = this.findQuestNodeById(this.activeQuest, this.pendingRecoverBattleNodeId);
        this.pendingRecoverBattleNodeId = null;
        if (!node || node.objectiveType !== 'recover' || node.children.length > 0 || node.isCompleted || !node.objectiveData?.recover) {
            return [];
        }

        const recover = node.objectiveData.recover;
        if (result === 'victory') {
            node.isCompleted = true;
            this.questProgressTracker?.recomputeCompletion();
            this.refreshContracts();
            this.renderQuestUi();
            player.addItemToInventory(this.createRecoverQuestItem(recover.itemName));
            return [`Quest tracker: ${recover.itemName} recovered from ${recover.personName}.`];
        }

        recover.hasFled = true;
        recover.isPersonKnown = true;
        recover.currentVillage = this.pickDifferentVillage(recover.currentVillage, worldMap);
        this.updateRecoverObjectiveText(node);
        this.refreshContracts();
        this.renderQuestUi();
        return [
            `${recover.personName} fled with ${recover.itemName}.`,
            `Quest updated: hunt ${recover.personName}; latest lead points to ${recover.currentVillage}.`,
        ];
    }

    private getRecruitableEscort(node: QuestNode): EscortObjectiveData | null {
        if (node.objectiveType !== 'escort' || node.children.length > 0 || node.isCompleted) {
            return null;
        }
        const escort = node.objectiveData?.escort;
        return escort && !escort.isDead ? escort : null;
    }

    private matchesEscortRecruitTarget(escort: EscortObjectiveData, normalizedPerson: string, normalizedVillage: string): boolean {
        return escort.personName.trim().toLocaleLowerCase() === normalizedPerson
            && escort.sourceVillage.trim().toLocaleLowerCase() === normalizedVillage;
    }

    public getGroupMembers(): Array<{ name: string; hp: number; maxHp: number; status: 'following' | 'dead' }> {
        if (!this.activeQuest) {
            return [];
        }

        const members: Array<{ name: string; hp: number; maxHp: number; status: 'following' | 'dead' }> = [];
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'escort' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const escort = node.objectiveData?.escort;
            if (!escort?.hasJoined) {
                return;
            }
            members.push({
                name: escort.personName,
                hp: this.getEscortCurrentHp(escort),
                maxHp: this.getEscortMaxHp(escort),
                status: escort.isDead ? 'dead' : 'following',
            });
        });
        return members;
    }

    public applyEscortBattleDamage(enemyName: string, damage: number): { applied: boolean; targetName?: string; died?: boolean } {
        if (!this.activeQuest || damage <= 0) {
            return { applied: false };
        }

        const joinedEscorts: EscortObjectiveData[] = [];
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType === 'escort' && node.children.length === 0 && !node.isCompleted && node.objectiveData?.escort?.hasJoined && !node.objectiveData.escort.isDead) {
                joinedEscorts.push(node.objectiveData.escort);
            }
        });
        if (joinedEscorts.length === 0) {
            return { applied: false };
        }

        const target = joinedEscorts[Math.floor(Math.random() * joinedEscorts.length)]!;
        const nextHp = Math.max(0, this.getEscortCurrentHp(target) - damage);
        this.setEscortCurrentHp(target, nextHp);
        const died = nextHp <= 0;
        if (died) {
            target.isDead = true;
            target.hasJoined = false;
        }
        this.questProgressTracker?.recomputeCompletion();
        this.renderQuestUi();
        return { applied: true, targetName: target.personName, died };
    }

    public recordBarterCompletion(traderName: string, itemName: string, villageName: string): 'updated' | 'no-objective' | 'inactive' {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return 'inactive';
        }
        const mainQuestChanged = this.questProgressTracker.recordBarterCompletion(traderName, itemName, villageName);
        const sideQuestChanged = this.progressSideQuestsOnBarterCompletion(traderName, itemName, villageName);
        if (!mainQuestChanged && !sideQuestChanged) {
            return 'no-objective';
        }
        this.renderQuestUi();
        this.refreshContracts();
        return 'updated';
    }

    public recordMonsterKill(monsterName: string): boolean {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return false;
        }
        const mainQuestChanged = this.questProgressTracker.recordMonsterKill(monsterName);
        const sideQuestChanged = this.progressSideQuestsOnMonsterKill(monsterName);
        if (!mainQuestChanged && !sideQuestChanged) {
            return false;
        }
        this.renderQuestUi();
        this.refreshContracts();
        return true;
    }

    public tryStartDefendObjective(
        villageName: string,
        npcName: string,
        availableVillagerNames: string[],
    ): { status: 'started' | 'inactive' | 'not-target' | 'already-active'; objectiveTitle?: string; days?: number } {
        if (!this.activeQuest || !this.questUiController) {
            return { status: 'inactive' };
        }
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const normalizedNpc = npcName.trim().toLocaleLowerCase();
        if (!normalizedVillage || !normalizedNpc) {
            return { status: 'not-target' };
        }

        let startedNode: QuestNode | null = null;
        let foundMatchingNode = false;
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (startedNode || node.objectiveType !== 'defend' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const defend = node.objectiveData?.defend;
            if (!defend) {
                return;
            }
            if (defend.villageName.trim().toLocaleLowerCase() !== normalizedVillage || defend.contactName.trim().toLocaleLowerCase() !== normalizedNpc) {
                return;
            }
            foundMatchingNode = true;
            if (defend.isDefenseActive) {
                return;
            }
            defend.isDefenseActive = true;
            defend.timeRemainingMinutes = Math.max(1, defend.durationDays * 24 * 60);
            defend.remainingBattles = this.rollDefenseBattleCount();
            defend.battleCooldownMinutes = this.rollDefenseCooldownMinutes(defend.timeRemainingMinutes, defend.remainingBattles);
            defend.defenders = this.createDefenderRoster(availableVillagerNames, defend.contactName, defend.fallenDefenderNames ?? []);
            startedNode = node;
        });

        if (!foundMatchingNode) {
            return { status: 'not-target' };
        }
        if (!startedNode) {
            return { status: 'already-active' };
        }

        this.renderQuestUi();
        this.refreshContracts();
        return {
            status: 'started',
            objectiveTitle: startedNode.title,
            days: startedNode.objectiveData?.defend?.durationDays ?? undefined,
        };
    }

    public onVillageTimeAdvanced(
        villageName: string,
        minutes: number,
    ): {
        stateChanged: boolean;
        triggeredBattle: boolean;
        attackers?: Skeleton[];
        allies?: Skeleton[];
        logs: string[];
    } {
        if (!this.activeQuest || !this.questUiController || minutes <= 0) {
            return { stateChanged: false, triggeredBattle: false, logs: [] };
        }

        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const logs: string[] = [];
        let stateChanged = false;
        let triggeredBattle = false;
        let attackers: Skeleton[] | undefined;
        let allies: Skeleton[] | undefined;

        this.visitQuestNodes(this.activeQuest, (node) => {
            if (triggeredBattle || node.objectiveType !== 'defend' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const defend = node.objectiveData?.defend;
            if (!defend?.isDefenseActive) {
                return;
            }
            if (defend.villageName.trim().toLocaleLowerCase() !== normalizedVillage) {
                return;
            }

            stateChanged = true;
            defend.timeRemainingMinutes = Math.max(0, defend.timeRemainingMinutes - minutes);
            this.regenerateDefenderRoster(defend, minutes);
            defend.battleCooldownMinutes = Math.max(0, (defend.battleCooldownMinutes ?? 0) - minutes);

            if (defend.timeRemainingMinutes <= 0) {
                node.isCompleted = true;
                defend.isDefenseActive = false;
                defend.remainingBattles = 0;
                defend.battleCooldownMinutes = 0;
                this.resolveDefendArtifactOutcome(defend, logs);
                return;
            }

            if ((defend.battleCooldownMinutes ?? 0) > 0) {
                return;
            }

            const livingDefenders = (defend.defenders ?? []).filter((defender) => !defender.isDead && defender.currentHp > 0);
            if (livingDefenders.length === 0) {
                defend.isDefenseActive = false;
                defend.timeRemainingMinutes = defend.durationDays * 24 * 60;
                defend.battleCooldownMinutes = 0;
                defend.remainingBattles = 0;
                defend.defenders = [];
                logs.push(`Defense line collapsed in ${defend.villageName}. The objective resets: speak with ${defend.contactName} again.`);
                return;
            }

            const remainingBattles = Math.max(0, defend.remainingBattles ?? 0);
            if (remainingBattles <= 0) {
                return;
            }

            attackers = this.createDefenseAttackers();
            allies = livingDefenders.map((defender) => this.createVillageCombatantFromDefender(defender));
            defend.remainingBattles = Math.max(0, remainingBattles - 1);
            defend.battleCooldownMinutes = defend.remainingBattles > 0
                ? this.rollDefenseCooldownMinutes(defend.timeRemainingMinutes, defend.remainingBattles)
                : 0;
            logs.push(`Raiders attack ${defend.villageName}! Hold the line until ${defend.artifactName} is secured.`);
            logs.push(`Defenders at your side: ${livingDefenders.map((defender) => defender.name).join(', ')}.`);
            triggeredBattle = true;
        });

        if (stateChanged) {
            this.questProgressTracker?.recomputeCompletion();
            this.renderQuestUi();
            this.refreshContracts();
        }

        return { stateChanged, triggeredBattle, attackers, allies, logs };
    }

    public rollbackDefendObjectivesForVillage(villageName: string): string[] {
        if (!this.activeQuest || !villageName.trim()) {
            return [];
        }
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const lines: string[] = [];
        let changed = false;
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'defend' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const defend = node.objectiveData?.defend;
            if (!defend?.isDefenseActive) {
                return;
            }
            if (defend.villageName.trim().toLocaleLowerCase() !== normalizedVillage) {
                return;
            }
            defend.isDefenseActive = false;
            defend.timeRemainingMinutes = defend.durationDays * 24 * 60;
            defend.battleCooldownMinutes = 0;
            defend.remainingBattles = 0;
            defend.defenders = [];
            lines.push(`You left ${defend.villageName} during the defense. The operation resets; report to ${defend.contactName} again.`);
            changed = true;
        });
        if (changed) {
            this.questProgressTracker?.recomputeCompletion();
            this.renderQuestUi();
        }
        return lines;
    }

    public applyDefenderBattleResults(villageName: string, survivors: Array<{ name: string; hp: number; maxHp?: number }>): string[] {
        if (!this.activeQuest || !villageName.trim()) {
            return [];
        }
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const survivorByName = new Map(survivors.map((survivor) => [survivor.name.trim().toLocaleLowerCase(), survivor]));
        const lines: string[] = [];
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'defend' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const defend = node.objectiveData?.defend;
            if (!defend?.isDefenseActive || defend.villageName.trim().toLocaleLowerCase() !== normalizedVillage) {
                return;
            }
            (defend.defenders ?? []).forEach((defender) => {
                const survivor = survivorByName.get(defender.name.trim().toLocaleLowerCase());
                if (survivor) {
                    defender.currentHp = Math.max(0, Math.min(defender.maxHp, survivor.hp));
                    defender.isDead = defender.currentHp <= 0;
                    return;
                }
                defender.currentHp = 0;
                defender.isDead = true;
                defend.fallenDefenderNames = Array.from(new Set([...(defend.fallenDefenderNames ?? []), defender.name]));
                lines.push(`${defender.name} was killed while defending ${defend.villageName}.`);
            });
            defend.defenders = (defend.defenders ?? []).filter((defender) => !defender.isDead);
        });
        if (lines.length > 0) {
            this.renderQuestUi();
            this.refreshContracts();
        }
        return lines;
    }

    public tryCreateQuestMonsterEncounter(worldMap: WorldMap): { enemies: Skeleton[]; hint?: string } | null {
        if (!this.questProgressTracker) {
            return null;
        }
        const maxDistanceCells = Math.max(1, Math.floor(balanceConfig.quest?.monsterObjectiveEncounterMaxDistanceCells ?? 7));
        const encounterChance = Math.min(1, Math.max(0, balanceConfig.quest?.monsterObjectiveEncounterChance ?? 0.35));
        for (const objective of this.collectActiveMonsterObjectives()) {
            if (!objective.villageName) {
                continue;
            }
            const hint = worldMap.getVillageDirectionHintFromPlayer(objective.villageName);
            if (!hint.exists || typeof hint.distanceCells !== 'number' || hint.distanceCells > maxDistanceCells) {
                continue;
            }
            if (Math.random() >= encounterChance) {
                continue;
            }
            const spawnCount = Math.max(1, Math.min(3, objective.remainingKills));
            const mutations = objective.mutations.filter((value): value is MonsterMutationTrait => ['feral strength', 'void armor', 'acid blood', 'blink speed', 'barbed hide', 'grave intellect'].includes(value));
            const enemies = Array.from({ length: spawnCount }, () => this.createQuestEnemy({ ...balanceConfig.enemies.skeleton, name: objective.targetName, mutations }));
            return { enemies, hint: `Scouts report ${objective.targetName} tracks near ${objective.villageName} (${hint.direction ?? 'nearby'}).` };
        }
        return null;
    }

    private collectActiveMonsterObjectives(): ActiveMonsterObjective[] {
        const objectives: ActiveMonsterObjective[] = [];
        objectives.push(...(this.questProgressTracker?.getActiveMonsterObjectives() ?? []));
        this.activeSideQuests
            .filter((quest) => quest.status === 'active')
            .forEach((quest) => {
                const tracker = new QuestProgressTracker(quest);
                objectives.push(...tracker.getActiveMonsterObjectives());
            });
        return objectives;
    }


    private createQuestEnemy(config: ConstructorParameters<typeof Skeleton>[2]): Skeleton {
        const enemy = new Skeleton(0, 0, config);
        assignMonsterBehaviorPool(enemy);
        return enemy;
    }

    private resolveEscortArrival(locationName: string): boolean {
        if (!this.activeQuest) {
            return false;
        }
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        let changed = false;
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'escort' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const escort = node.objectiveData?.escort;
            if (!escort || escort.isDead || !escort.hasJoined) {
                return;
            }
            if (escort.destinationVillage.trim().toLocaleLowerCase() !== normalizedLocation) {
                return;
            }
            node.isCompleted = true;
            escort.hasJoined = false;
            changed = true;
        });
        if (changed) {
            this.questProgressTracker?.recomputeCompletion();
        }
        return changed;
    }

    private updateSideQuestDeliveryProgress(locationName: string, carriedItemNames: string[]): boolean {
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        if (!normalizedLocation) {
            return false;
        }
        const carriedItems = new Set(carriedItemNames.map((name) => name.trim().toLocaleLowerCase()).filter(Boolean));
        let changed = false;
        this.activeSideQuests.forEach((quest) => {
            if (quest.status === 'readyToTurnIn' || quest.status === 'completed') {
                return;
            }
            const hasSatisfiedDelivery = quest.children.some((child) => {
                const deliverObjective = child.objectiveData?.deliver;
                if (!deliverObjective?.isPickedUp || !deliverObjective.destinationVillage || !deliverObjective.itemName) {
                    return false;
                }
                const isAtDestination = deliverObjective.destinationVillage.trim().toLocaleLowerCase() === normalizedLocation;
                const hasItem = carriedItems.has(deliverObjective.itemName.trim().toLocaleLowerCase());
                return isAtDestination && hasItem;
            });
            if (!hasSatisfiedDelivery) {
                return;
            }
            quest.status = 'readyToTurnIn';
            changed = true;
        });
        return changed;
    }

    private syncKnownQuestLocations(): void {
        if (!this.worldMap) {
            return;
        }
        this.getKnownQuestLocationNames()
            .forEach((locationName) => this.worldMap?.registerNamedLocation(locationName));
    }

    private collectKnownQuestLocationNames(quest: QuestNode): string[] {
        const knownNodes = collectKnownQuestNodes(quest);
        const locationNames = new Set<string>();
        const visit = (node: QuestNode): void => {
            if (knownNodes.has(node)) {
                node.entities
                    .filter((entity) => entity.type === 'location')
                    .map((entity) => entity.text.trim())
                    .filter((name) => name.length > 0)
                    .forEach((name) => locationNames.add(name));
            }
            node.children.forEach((child) => visit(child));
        };
        visit(quest);
        return Array.from(locationNames).sort((left, right) => left.localeCompare(right));
    }

    private collectQuestLocationNames(quest: QuestNode): string[] {
        const locationNames = new Set<string>();
        const visit = (node: QuestNode): void => {
            node.entities
                .filter((entity) => entity.type === 'location')
                .map((entity) => entity.text.trim())
                .filter((name) => name.length > 0)
                .forEach((name) => locationNames.add(name));
            node.children.forEach((child) => visit(child));
        };
        visit(quest);
        return Array.from(locationNames);
    }

    private collectBarterContracts(quest: QuestNode): Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' | 'recover' }> {
        const contracts: Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' | 'recover' }> = [];
        const knownNodes = collectKnownQuestNodes(quest);
        const visit = (node: QuestNode): void => {
            if (!knownNodes.has(node)) {
                node.children.forEach((child) => visit(child));
                return;
            }
            if (node.objectiveType === 'barter' && node.children.length === 0) {
                const trader = node.entities.find((entity) => entity.type === 'person')?.text?.trim();
                const item = node.entities.find((entity) => entity.type === 'item')?.text?.trim();
                if (trader && item) {
                    contracts.push({ traderName: trader, itemName: item, contractType: 'barter' });
                }
            }
            if (node.objectiveType === 'deliver' && node.children.length === 0) {
                const deliverData = node.objectiveData?.deliver;
                if (deliverData?.sourceTrader && deliverData?.itemName) {
                    contracts.push({ traderName: deliverData.sourceTrader, itemName: deliverData.itemName, sourceVillage: deliverData.sourceVillage, destinationVillage: deliverData.destinationVillage, contractType: 'deliver' });
                }
            }
            if (node.objectiveType === 'recover' && node.children.length === 0 && !node.isCompleted) {
                const recoverData = node.objectiveData?.recover;
                if (recoverData?.isPersonKnown) {
                    contracts.push({
                        traderName: recoverData.personName,
                        itemName: recoverData.itemName,
                        sourceVillage: recoverData.currentVillage,
                        contractType: 'recover',
                    });
                }
            }
            node.children.forEach((child) => visit(child));
        };
        visit(quest);
        return contracts;
    }

    private collectEscortContracts(quest: QuestNode): Array<{ personName: string; sourceVillage: string; destinationVillage: string }> {
        const contracts: Array<{ personName: string; sourceVillage: string; destinationVillage: string }> = [];
        const knownNodes = collectKnownQuestNodes(quest);
        this.visitQuestNodes(quest, (node) => {
            if (!knownNodes.has(node) || node.objectiveType !== 'escort' || node.children.length > 0 || !node.objectiveData?.escort) {
                return;
            }
            const escort = node.objectiveData.escort;
            contracts.push({ personName: escort.personName, sourceVillage: escort.sourceVillage, destinationVillage: escort.destinationVillage });
        });
        return contracts;
    }

    private refreshContracts(): void {
        if (!this.activeQuest || !this.onContractsUpdated) {
            return;
        }
        this.syncKnownQuestLocations();
        this.onContractsUpdated({
            barterContracts: this.collectBarterContracts(this.activeQuest),
            escortContracts: this.collectEscortContracts(this.activeQuest),
            defendContracts: this.collectDefendContracts(this.activeQuest),
        });
    }

    private collectDefendContracts(quest: QuestNode): Array<{
        personName: string;
        villageName: string;
        artifactName: string;
        activeDefenderNames: string[];
        fallenDefenderNames: string[];
    }> {
        const contracts: Array<{
            personName: string;
            villageName: string;
            artifactName: string;
            activeDefenderNames: string[];
            fallenDefenderNames: string[];
        }> = [];
        const knownNodes = collectKnownQuestNodes(quest);
        this.visitQuestNodes(quest, (node) => {
            if (!knownNodes.has(node) || node.objectiveType !== 'defend' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const defend = node.objectiveData?.defend;
            if (!defend?.contactName || !defend.villageName) {
                return;
            }
            contracts.push({
                personName: defend.contactName,
                villageName: defend.villageName,
                artifactName: defend.artifactName,
                activeDefenderNames: (defend.defenders ?? []).filter((defender) => !defender.isDead).map((defender) => defender.name),
                fallenDefenderNames: [...(defend.fallenDefenderNames ?? [])],
            });
        });
        return contracts;
    }

    private updateRecoverObjectiveText(node: QuestNode): void {
        if (node.objectiveType !== 'recover' || !node.objectiveData?.recover) {
            return;
        }
        const recover = node.objectiveData.recover;
        if (recover.hasFled) {
            node.description = `${recover.personName} fled from ${recover.initialVillage} with ${recover.itemName}. Track them down in ${recover.currentVillage} and take it back by force.`;
            node.conditionText = `Defeat ${recover.personName} in ${recover.currentVillage} and recover ${recover.itemName}.`;
            return;
        }
        if (recover.isPersonKnown) {
            node.description = `Locals confirmed ${recover.personName} is holding ${recover.itemName} in ${recover.currentVillage}. Confront them and take it, whatever the cost.`;
            node.conditionText = `Defeat ${recover.personName} at ${recover.currentVillage} and secure ${recover.itemName}.`;
        }
    }

    private ensureRecoverEnemyProfile(recover: RecoverObjectiveData): NonNullable<RecoverObjectiveData['enemyProfile']> {
        if (recover.enemyProfile) {
            return recover.enemyProfile;
        }
        const roll = (): number => Math.floor(Math.random() * 4);
        recover.enemyProfile = {
            archetypeId: 'human',
            xpValue: 8,
            width: 30,
            height: 30,
            baseStats: {
                hp: 8 + roll(),
                damage: 2 + roll(),
                armor: 1 + roll(),
                mana: 2 + roll(),
            },
            skills: {
                vitality: 1 + roll(),
                toughness: 1 + roll(),
                strength: 1 + roll(),
                agility: 1 + roll(),
                connection: roll(),
                intelligence: roll(),
            },
        };
        return recover.enemyProfile;
    }

    private toRecoverEnemyConfig(personName: string, profile: NonNullable<RecoverObjectiveData['enemyProfile']>) {
        return {
            archetypeId: 'human' as const,
            xpValue: profile.xpValue,
            name: personName,
            width: profile.width,
            height: profile.height,
            baseStats: profile.baseStats,
            skills: profile.skills,
        };
    }

    private pickDifferentVillage(currentVillage: string, worldMap: WorldMap): string {
        const villages = worldMap.getAllVillageNames().filter((name) => name.trim().length > 0);
        if (villages.length <= 1) {
            return currentVillage;
        }
        const alternatives = villages.filter((name) => name.trim().toLocaleLowerCase() !== currentVillage.trim().toLocaleLowerCase());
        if (alternatives.length === 0) {
            return currentVillage;
        }
        return alternatives[Math.floor(Math.random() * alternatives.length)]!;
    }

    private createRecoverQuestItem(itemName: string): Item {
        const normalized = itemName.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-');
        return new Item({
            id: `quest-recover-${normalized || 'artifact'}`,
            name: itemName,
            description: `Recovered quest artifact: ${itemName}.`,
            type: 'quest',
            goldValue: 0,
            findWeight: 0,
            spriteClass: 'quest-item-sprite',
        });
    }

    private getVillagerQuestKey(villageName: string, npcName: string): string {
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const normalizedNpc = npcName.trim().toLocaleLowerCase();
        return `${normalizedVillage}::${normalizedNpc}`;
    }

    private normalizeSideQuestStatus(status: QuestStatus | undefined): QuestStatus {
        if (status === 'active' || status === 'readyToTurnIn' || status === 'completed') {
            return status;
        }
        return 'available';
    }

    private isMatchingQuestGiver(quest: QuestNode, npcName: string, villageName: string): boolean {
        if (!quest.giverNpcName || !quest.giverVillageName) {
            return false;
        }
        return quest.giverNpcName.trim().toLocaleLowerCase() === npcName.trim().toLocaleLowerCase()
            && quest.giverVillageName.trim().toLocaleLowerCase() === villageName.trim().toLocaleLowerCase();
    }

    private findQuestNodeById(node: QuestNode, id: string): QuestNode | null {
        if (node.id === id) {
            return node;
        }
        for (const child of node.children) {
            const found = this.findQuestNodeById(child, id);
            if (found) {
                return found;
            }
        }
        return null;
    }

    private visitQuestNodes(node: QuestNode, visitor: (node: QuestNode) => void): void {
        visitor(node);
        node.children.forEach((child) => this.visitQuestNodes(child, visitor));
    }

    private getEscortCurrentHp(escort: EscortObjectiveData): number {
        const metadata = escort as EscortObjectiveData & { currentHp?: number };
        if (typeof metadata.currentHp === 'number') {
            return metadata.currentHp;
        }
        return this.getEscortMaxHp(escort);
    }

    private setEscortCurrentHp(escort: EscortObjectiveData, hp: number): void {
        const metadata = escort as EscortObjectiveData & { currentHp?: number };
        metadata.currentHp = Math.max(0, hp);
    }

    private getEscortMaxHp = (_escort: EscortObjectiveData): number => 6;

    private createDefenderRoster(availableVillagerNames: string[], contactName: string, fallenDefenderNames: string[]): DefendObjectiveDefender[] {
        const normalizedContact = contactName.trim().toLocaleLowerCase();
        const fallenNames = new Set(fallenDefenderNames.map((name) => name.trim().toLocaleLowerCase()));
        const uniqueNames = Array.from(
            new Set(
                availableVillagerNames
                    .map((name) => name.trim())
                    .filter((name) => name.length > 0),
            ),
        );
        const prioritized = uniqueNames.filter((name) => name.toLocaleLowerCase() !== normalizedContact && !fallenNames.has(name.toLocaleLowerCase()));
        const shouldIncludeContact = !fallenNames.has(contactName.trim().toLocaleLowerCase());
        const pool = [shouldIncludeContact ? contactName.trim() : '', ...prioritized].filter((name) => name.length > 0);
        const defenderCount = Math.min(pool.length, this.randomInt(2, 5));
        return pool.slice(0, defenderCount).map((name) => this.createDefenderProfile(name));
    }

    private regenerateDefenderRoster(defend: DefendObjectiveData, minutes: number): void {
        const healAmount = Math.floor(minutes / (8 * 60));
        if (healAmount <= 0) {
            return;
        }
        (defend.defenders ?? []).forEach((defender) => {
            if (defender.isDead || defender.currentHp <= 0) {
                return;
            }
            defender.currentHp = Math.min(defender.maxHp, defender.currentHp + healAmount);
        });
    }

    private createDefenseAttackers(): Skeleton[] {
        const count = this.randomInt(1, 6);
        return Array.from({ length: count }, (_, index) => this.createVillageCombatant(`Hired Blade ${index + 1}`));
    }

    private createDefenderProfile(name: string): DefendObjectiveDefender {
        const level = this.randomInt(1, 4);
        const maxHp = this.randomInt(7, 11) + level;
        const inventoryItemIds = this.rollDefenderInventoryItemIds(level);
        const [equippedWeaponItemId, equippedArmorItemId] = this.pickDefenderEquipment(inventoryItemIds);
        return {
            name,
            level,
            maxHp,
            currentHp: maxHp,
            inventoryItemIds,
            equippedWeaponItemId,
            equippedArmorItemId,
            stats: {
                damage: this.randomInt(4, 7) + level,
                armor: this.randomInt(0, 3),
                mana: this.randomInt(0, 4),
                vitality: this.randomInt(0, 4) + level,
                toughness: this.randomInt(0, 4) + level,
                strength: this.randomInt(0, 4) + level,
                agility: this.randomInt(0, 4) + level,
                connection: this.randomInt(0, 3),
                intelligence: this.randomInt(0, 3),
            },
        };
    }

    private rollDefenderInventoryItemIds(level: number): string[] {
        const pool = DISCOVERABLE_ITEM_LIBRARY;
        const rolls = this.randomInt(2, Math.min(5, level + 2));
        const itemIds: string[] = [];
        for (let index = 0; index < rolls; index += 1) {
            const randomItem = pool[this.randomInt(0, pool.length - 1)];
            if (!randomItem?.id) {
                continue;
            }
            itemIds.push(randomItem.id);
        }
        return itemIds;
    }

    private pickDefenderEquipment(inventoryItemIds: string[]): [string | undefined, string | undefined] {
        const items = inventoryItemIds.map((itemId) => DISCOVERABLE_ITEM_LIBRARY.find((entry) => entry.id === itemId)).filter(Boolean);
        const bestWeapon = items
            .filter((item) => item.type === 'weapon')
            .sort((left, right) => (right.damageBonus ?? 0) - (left.damageBonus ?? 0))[0];
        const bestArmor = items
            .filter((item) => item.type === 'armor')
            .sort((left, right) => (right.effects?.flatArmor ?? 0) - (left.effects?.flatArmor ?? 0))[0];
        return [bestWeapon?.id, bestArmor?.id];
    }

    private createVillageCombatantFromDefender(defender: DefendObjectiveDefender): Skeleton {
        const stats = defender.stats;
        const equippedWeaponData = defender.equippedWeaponItemId
            ? DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === defender.equippedWeaponItemId)
            : undefined;
        const equippedArmorData = defender.equippedArmorItemId
            ? DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === defender.equippedArmorItemId)
            : undefined;
        const damageFromWeapon = equippedWeaponData?.damageBonus ?? 0;
        const armorFromItem = equippedArmorData?.effects?.flatArmor ?? 0;
        const combatant = this.createVillageCombatant(
            defender.name,
            defender.maxHp,
            defender.currentHp,
            3 + damageFromWeapon + (stats?.damage ?? 0),
            4 + damageFromWeapon + (stats?.damage ?? 0),
            (stats?.armor ?? 0) + armorFromItem,
            stats?.mana ?? 0,
            stats,
        );
        const persistedMaxHp = Math.max(1, defender.maxHp);
        const persistedCurrentHp = Math.max(0, Math.min(persistedMaxHp, defender.currentHp));
        combatant.maxHp = persistedMaxHp;
        combatant.hp = persistedCurrentHp;
        combatant.active = combatant.hp > 0;
        return combatant;
    }

    private createVillageCombatant(
        name: string,
        maxHp?: number,
        currentHp?: number,
        minDamage: number = 3,
        maxDamage: number = 6,
        armor: number = this.randomInt(0, 2),
        mana: number = this.randomInt(0, 3),
        stats?: DefendObjectiveDefender['stats'],
    ): Skeleton {
        const defender = new Skeleton(0, 0, {
            archetypeId: 'human',
            xpValue: this.randomInt(3, 6),
            name,
            width: 30,
            height: 30,
            baseStats: {
                hp: maxHp ?? this.randomInt(7, 11),
                damage: this.randomInt(minDamage, maxDamage),
                armor,
                mana,
            },
            skills: {
                vitality: stats?.vitality ?? this.randomInt(0, 3),
                toughness: stats?.toughness ?? this.randomInt(0, 3),
                strength: stats?.strength ?? this.randomInt(0, 3),
                agility: stats?.agility ?? this.randomInt(0, 3),
                connection: stats?.connection ?? this.randomInt(0, 2),
                intelligence: stats?.intelligence ?? this.randomInt(0, 2),
            },
        });
        if (typeof currentHp === 'number') {
            defender.hp = Math.max(0, Math.min(defender.maxHp, currentHp));
            if (defender.hp <= 0) {
                defender.active = false;
            }
        }
        return defender;
    }

    private resolveDefendArtifactOutcome(defend: DefendObjectiveData, logs: string[]): void {
        const staysWithNpc = Math.random() < 0.5;
        if (staysWithNpc) {
            logs.push(`${defend.contactName} keeps ${defend.artifactName} under guard in ${defend.villageName}.`);
            return;
        }
        const added = this.createRecoverQuestItem(defend.artifactName);
        logs.push(`${defend.artifactName} is completed and awarded to you.`);
        logs.push(`Quest reward prepared: ${added.name}.`);
    }

    private rollDefenseCooldownMinutes(timeRemainingMinutes: number, remainingBattles: number): number {
        const safeRemainingBattles = Math.max(1, remainingBattles);
        const averageGap = Math.max(60, Math.floor(timeRemainingMinutes / (safeRemainingBattles + 1)));
        const minimumGap = Math.max(60, Math.floor(averageGap * 0.5));
        const maximumGap = Math.max(minimumGap, Math.floor(averageGap * 1.5));
        return this.randomInt(minimumGap, maximumGap);
    }

    private rollDefenseBattleCount(): number {
        return this.randomInt(2, 6);
    }

    private renderQuestUi(): void {
        if (!this.questUiController || !this.activeQuest) {
            return;
        }
        this.questUiController.renderQuest(this.activeQuest, this.getKnownSideQuestsForUi());
    }

    private getKnownSideQuestsForUi(): QuestNode[] {
        const known: QuestNode[] = [];
        const seenIds = new Set<string>();
        for (const offers of this.sideQuestOffersByNpc.values()) {
            for (const offer of offers) {
                if (seenIds.has(offer.id)) {
                    continue;
                }
                seenIds.add(offer.id);
                known.push(offer);
            }
        }
        for (const sideQuest of this.activeSideQuests) {
            if (seenIds.has(sideQuest.id)) {
                continue;
            }
            seenIds.add(sideQuest.id);
            known.push(sideQuest);
        }
        return known;
    }

    private progressSideQuestsOnLocationEntry(
        locationName: string,
        carriedItemNames: string[],
        onRecoveredItemFound?: (item: Item) => boolean,
    ): { changed: boolean; logs: string[] } {
        const normalizedLocation = locationName.trim();
        const lines: string[] = [];
        let changed = false;

        for (const sideQuest of this.activeSideQuests) {
            if (sideQuest.status !== 'active') {
                continue;
            }

            const tracker = new QuestProgressTracker(sideQuest);
            let sideQuestChanged = false;
            const recoverLogs = this.autoRecoverSideQuestItems(sideQuest, normalizedLocation, onRecoveredItemFound);
            if (recoverLogs.length > 0) {
                recoverLogs.forEach((line) => lines.push(line));
                tracker.recomputeCompletion();
                sideQuestChanged = true;
            }
            if (tracker.recordLocationEntryWithInventory(locationName, carriedItemNames)) {
                sideQuestChanged = true;
            }
            if (!sideQuestChanged) {
                continue;
            }
            changed = true;
            if (sideQuest.isCompleted) {
                sideQuest.status = 'readyToTurnIn';
                lines.push(`Side quest ready to turn in: ${sideQuest.title}.`);
            }
        }

        return { changed, logs: lines };
    }

    private progressSideQuestsOnBarterCompletion(traderName: string, itemName: string, villageName: string): boolean {
        return this.progressActiveSideQuests((tracker) => tracker.recordBarterCompletion(traderName, itemName, villageName));
    }

    private progressSideQuestsOnMonsterKill(monsterName: string): boolean {
        return this.progressActiveSideQuests((tracker) => tracker.recordMonsterKill(monsterName));
    }

    private autoRecoverSideQuestItems(
        sideQuest: QuestNode,
        locationName: string,
        onRecoveredItemFound?: (item: Item) => boolean,
    ): string[] {
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        if (!normalizedLocation) {
            return [];
        }
        const logs: string[] = [];
        this.visitQuestNodes(sideQuest, (node) => {
            if (node.objectiveType !== 'recover' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const recover = node.objectiveData?.recover;
            if (!recover || recover.currentVillage.trim().toLocaleLowerCase() !== normalizedLocation) {
                return;
            }
            const recoverItem = this.createRecoverQuestItem(recover.itemName);
            if (!onRecoveredItemFound) {
                logs.push(`Quest tracker: recover item "${recover.itemName}" could not be awarded because inventory callback is unavailable.`);
                return;
            }
            const wasAdded = onRecoveredItemFound(recoverItem);
            if (!wasAdded) {
                logs.push(`Quest tracker: Found ${recover.itemName} in ${recover.currentVillage}, but your inventory is full.`);
                return;
            }
            node.isCompleted = true;
            recover.isPersonKnown = true;
            logs.push(`Quest tracker: Found ${recover.itemName} lying on the ground in ${recover.currentVillage}.`);
        });
        return logs;
    }

    private progressActiveSideQuests(progressFn: (tracker: QuestProgressTracker) => boolean): boolean {
        let changed = false;
        for (const sideQuest of this.activeSideQuests) {
            if (sideQuest.status !== 'active') {
                continue;
            }
            const tracker = new QuestProgressTracker(sideQuest);
            const questChanged = progressFn(tracker);
            if (!questChanged) {
                continue;
            }
            changed = true;
            if (sideQuest.isCompleted) {
                sideQuest.status = 'readyToTurnIn';
            }
        }
        return changed;
    }

    private randomInt(min: number, max: number): number {
        const lower = Math.ceil(Math.min(min, max));
        const upper = Math.floor(Math.max(min, max));
        return lower + Math.floor(Math.random() * ((upper - lower) + 1));
    }
}
