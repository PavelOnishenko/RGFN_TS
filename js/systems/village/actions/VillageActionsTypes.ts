import Item from '../../../entities/Item.js';
import Skeleton from '../../../entities/Skeleton.js';
import { PersonDirectionHint, VillageDirectionHint, VillageNpcProfile } from '../VillageDialogueEngine.js';
import { DeliverObjectiveData, LocalDeliveryObjectiveData, QuestNode, QuestRewardMetadata } from '../../quest/QuestTypes.js';
import type { VillageNpcRosterEntry } from '../VillageNpcRoster.js';
import type { NpcCapabilities, NpcWorldState } from '../../world-sim/npc/NpcTaskTypes.js';

export type VillageUI = {
    sidebar: HTMLElement;
    rumorsPanel: HTMLElement;
    title: HTMLElement;
    prompt: HTMLElement;
    actions: HTMLElement;
    sleepRoomBtn: HTMLButtonElement;
    villageWaitBtn: HTMLButtonElement;
    innMealBtn: HTMLButtonElement;
    dialogueModal: HTMLElement;
    dialogueCloseBtn: HTMLButtonElement;
    dialogueSelectedNpc: HTMLElement;
    dialogueLog: HTMLElement;
    sideQuestPanel: HTMLElement;
    sideQuestList: HTMLElement;
    buyOffer1Btn: HTMLButtonElement;
    buyOffer2Btn: HTMLButtonElement;
    buyOffer3Btn: HTMLButtonElement;
    buyOffer4Btn: HTMLButtonElement;
    sellSelect: HTMLSelectElement;
    sellSelectedBtn: HTMLButtonElement;
    npcList: HTMLElement;
    npcTitle: HTMLElement;
    rosterVillageFilter: HTMLSelectElement;
    rosterList: HTMLElement;
    askVillageInput: HTMLSelectElement;
    askVillageBtn: HTMLButtonElement;
    askNearbySettlementsBtn: HTMLButtonElement;
    askPersonInput: HTMLSelectElement;
    askPersonBtn: HTMLButtonElement;
    askBarterBtn: HTMLButtonElement;
    barterNowBtn: HTMLButtonElement;
    courierActionBtn: HTMLButtonElement;
    confrontRecoverBtn: HTMLButtonElement;
    recruitEscortBtn: HTMLButtonElement;
    defendVillageBtn: HTMLButtonElement;
};

export type VillageActionsCallbacks = {
    onUpdateHUD: () => void;
    onAdvanceTime: (minutes: number, fatigueScale: number) => void;
    onLeaveVillage: () => void;
    getVillageDirectionHint: (settlementName: string) => VillageDirectionHint;
    getAllVillagePlacements?: () => Array<{ name: string; col: number; row: number }>;
    getNearbyVillageNames?: (villageName: string, maxDistanceCells: number) => string[];
    getKnownSettlementNames?: () => string[];
    getKnownQuestSettlementNames?: () => string[];
    getNpcCapabilities?: (npcId: string, villageName: string) => NpcCapabilities;
    getNpcWorldState?: (npcId: string) => NpcWorldState | null;
    onNpcRosterEntryChanged?: (entry: VillageNpcRosterEntry) => void;
    onClearNpcRoster?: () => void;
    onVillageBarterCompleted: (traderName: string, itemName: string, villageName: string) => void;
    onTryRecruitEscort: (personName: string, villageName: string) => 'joined' | 'inactive' | 'already-joined' | 'not-available';
    onRevealRecoverHolder?: (villageName: string, npcName: string) => { revealed: boolean; personName?: string; itemName?: string };
    onTryStartRecoverConfrontation?: (
        personName: string,
        villageName: string,
    ) => { status: 'started' | 'inactive' | 'not-target' | 'not-ready'; enemies?: Skeleton[]; itemName?: string };
    onStartBattle?: (enemies: Skeleton[]) => void;
    onTryStartDefend?: (
        npcName: string,
        villageName: string,
        villagerNames: string[],
    ) => { status: 'started' | 'inactive' | 'not-target' | 'already-active'; objectiveTitle?: string; days?: number };
    initializeVillageSideQuestOffers?: (villageName: string, npcQuestOfferRolls: Array<{ npcName: string; questCount: number }>) => void;
    getVillageSideQuestOffers?: (villageName: string, npcName: string) => QuestNode[];
    getVillageNpcActiveSideQuests?: (villageName: string, npcName: string) => QuestNode[];
    getActiveSideQuests?: () => QuestNode[];
    acceptSideQuest?: (questId: string) => { accepted: boolean; reason?: 'inactive' | 'not-found' | 'already-active' };
    markSideQuestReadyToTurnIn?: (questId: string) => boolean;
    turnInSideQuest?: (questId: string, npcName: string, villageName: string) => {
        turnedIn: boolean;
        reason?: 'inactive' | 'not-found' | 'wrong-giver' | 'not-ready' | 'already-completed';
        reward?: string;
        rewardMetadata?: QuestRewardMetadata;
    };
};

export type QuestEscortContract = {
    personName: string;
    sourceVillage: string;
    destinationVillage: string;
};

export type QuestDefendContract = {
    personName: string;
    villageName: string;
    artifactName: string;
    activeDefenderNames?: string[];
    fallenDefenderNames?: string[];
};

export type QuestBarterContract = {
    traderName: string;
    itemName: string;
    sourceVillage?: string;
    destinationVillage?: string;
    contractType: 'barter' | 'deliver' | 'recover';
};

export type QuestCourierInteraction = {
    questId: string;
} & (
    { objectiveType: 'localDelivery'; objective: LocalDeliveryObjectiveData }
    | { objectiveType: 'deliver'; objective: DeliverObjectiveData }
);

export type VillageOffer = {
    kindName: string;
    buyPrice: number;
    possibleItemIds: string[];
    isEnchantedWeaponOffer?: boolean;
};

export type BarterItemCost = {
    itemId: string;
    itemName: string;
    quantity: number;
};

export type BarterPaymentOption = {
    label: string;
    goldCost: number;
    itemCosts: BarterItemCost[];
};

export type VillageBarterDeal = {
    contractId: string;
    traderName: string;
    rewardItem: Item;
    negotiationLine: string;
    paymentOptions: BarterPaymentOption[];
    isCompleted: boolean;
};

export type OfferKind = {
    kindName: string;
    buyPrice: number;
    itemIds: string[];
};

export type VillageSettlementAnswer = {
    npc: VillageNpcProfile;
    targetSettlement: string;
    hint: VillageDirectionHint;
};

export type VillagePersonAnswer = {
    npc: VillageNpcProfile;
    targetPerson: string;
    hint: PersonDirectionHint;
};

export const POTION_KINDS: OfferKind[] = [
    { kindName: 'Healing Potion', buyPrice: 4, itemIds: ['healingPotion'] },
    { kindName: 'Mana Potion', buyPrice: 5, itemIds: ['manaPotion'] },
];

export const NON_POTION_KINDS: OfferKind[] = [
    { kindName: 'Knife', buyPrice: 4, itemIds: ['knife_t1', 'knife_t2', 'knife_t3', 'knife_t4'] },
    { kindName: 'Short Sword', buyPrice: 9, itemIds: ['shortSword_t1', 'shortSword_t2', 'shortSword_t3', 'shortSword_t4'] },
    { kindName: 'Axe', buyPrice: 12, itemIds: ['axe_t1', 'axe_t2', 'axe_t3', 'axe_t4'] },
    { kindName: 'Two-Handed Sword', buyPrice: 22, itemIds: ['twoHandedSword_t1', 'twoHandedSword_t2', 'twoHandedSword_t3', 'twoHandedSword_t4'] },
    { kindName: 'Bow', buyPrice: 15, itemIds: ['bow_t1', 'bow_t2', 'bow_t3', 'bow_t4'] },
    { kindName: 'Crossbow', buyPrice: 24, itemIds: ['crossbow_t1', 'crossbow_t2', 'crossbow_t3', 'crossbow_t4'] },
    { kindName: 'Armor', buyPrice: 16, itemIds: ['armor_t1', 'armor_t2', 'armor_t3', 'armor_t4'] },
];
