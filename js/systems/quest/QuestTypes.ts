export type QuestObjectiveType =
    | 'eliminate'
    | 'deliver'
    | 'localDelivery'
    | 'travel'
    | 'barter'
    | 'scout'
    | 'hunt'
    | 'recover'
    | 'escort'
    | 'defend'
    | 'gather'
    | 'repair'
    | 'patrol';

export type QuestNameDomain = 'location' | 'artifact' | 'character' | 'monster' | 'mainQuest';

export type PackSourceType = 'local-pattern' | 'map-village' | 'remote-location' | 'remote-name' | 'echo';
export type QuestTrack = 'main' | 'side';
export type QuestStatus = 'available' | 'active' | 'readyToTurnIn' | 'completed';

export type QuestNode = {
    id: string;
    title: string;
    description: string;
    conditionText: string;
    objectiveType: QuestObjectiveType;
    entities: QuestTextEntity[];
    objectiveData?: QuestObjectiveData;
    children: QuestNode[];
    isCompleted?: boolean;
    track?: QuestTrack;
    giverNpcName?: string;
    giverVillageName?: string;
    reward?: string;
    rewardMetadata?: QuestRewardMetadata;
    status?: QuestStatus;
};

export type DeliverObjectiveData = {
    sourceVillage: string;
    sourceTrader: string;
    destinationVillage: string;
    itemName: string;
    isPickedUp?: boolean;
};

export type LocalDeliveryObjectiveData = {
    villageName: string;
    sourceNpcName: string;
    recipientNpcName: string;
    itemName: string;
    isPickedUp?: boolean;
    isDelivered?: boolean;
};

export type GeneratedName = {
    text: string;
    domain: QuestNameDomain;
    sourceTypes: PackSourceType[];
};

export type QuestTextEntity = {
    text: string;
    type: 'location' | 'item' | 'person' | 'monster';
};

export type RareMonsterProfile = {
    name: GeneratedName;
    count: number;
    stats: string[];
    effects: string[];
    bonus: string;
    mutatedFrom: string;
};

export type MonsterObjectiveData = {
    targetName: string;
    requiredKills: number;
    currentKills?: number;
    villageName?: string;
    mutations?: string[];
    mutatedFrom?: string;
};

export type EscortObjectiveData = {
    personName: string;
    sourceVillage: string;
    destinationVillage: string;
    hasJoined?: boolean;
    isDead?: boolean;
};

export type RecoverEnemyProfile = {
    archetypeId: string;
    xpValue: number;
    width: number;
    height: number;
    baseStats: { hp: number; damage: number; armor: number; mana: number };
    skills: { vitality: number; toughness: number; strength: number; agility: number; connection: number; intelligence: number };
};

export type RecoverObjectiveData = {
    itemName: string;
    personName: string;
    initialVillage: string;
    currentVillage: string;
    isPersonKnown?: boolean;
    hasFled?: boolean;
    enemyProfile?: RecoverEnemyProfile;
};

export type DefendObjectiveDefender = {
    name: string;
    level: number;
    maxHp: number;
    currentHp: number;
    inventoryItemIds: string[];
    equippedWeaponItemId?: string;
    equippedArmorItemId?: string;
    stats?: {
        damage: number;
        armor: number;
        mana: number;
        vitality: number;
        toughness: number;
        strength: number;
        agility: number;
        connection: number;
        intelligence: number;
    };
    isDead?: boolean;
};

export type DefendObjectiveData = {
    villageName: string;
    artifactName: string;
    contactName: string;
    durationDays: number;
    timeRemainingMinutes: number;
    isDefenseActive?: boolean;
    defenders?: DefendObjectiveDefender[];
    fallenDefenderNames?: string[];
    battleCooldownMinutes?: number;
    remainingBattles?: number;
};

export type GatherObjectiveData = {
    villageName: string;
    itemName: string;
    requiredAmount: number;
    currentAmount?: number;
};

export type RepairObjectiveData = {
    villageName: string;
    structureName: string;
    requiredMaterials: string[];
    repairedMaterials?: string[];
    isRepaired?: boolean;
};

export type PatrolObjectiveData = {
    villageName: string;
    checkpoints: string[];
    visitedCheckpoints?: string[];
    isPatrolComplete?: boolean;
};

export type QuestRewardMetadata = {
    xp: number;
    gold: number;
    itemName: string;
    requiresTurnIn: true;
};

export type QuestObjectiveData = {
    deliver?: DeliverObjectiveData;
    localDelivery?: LocalDeliveryObjectiveData;
    monster?: MonsterObjectiveData;
    escort?: EscortObjectiveData;
    recover?: RecoverObjectiveData;
    defend?: DefendObjectiveData;
    gather?: GatherObjectiveData;
    repair?: RepairObjectiveData;
    patrol?: PatrolObjectiveData;
};
