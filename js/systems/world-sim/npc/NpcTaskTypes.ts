export type NpcProfession = 'hunter' | 'trader' | 'miller' | 'guard' | 'herbalist' | 'carpenter' | 'innkeeper' | 'resident';

export type NpcTaskKind = 'sleep' | 'idleAtHome' | 'travelToWork' | 'returnHome' | 'hunt' | 'gatherHerbs'
    | 'processHerbs' | 'operateShop' | 'operateInn' | 'mill' | 'guardVillage' | 'carpentry' | 'villageChores';

export type NpcUnavailableReason = 'sleeping' | 'away' | 'working' | 'dead' | null;

export type NpcGridPosition = { col: number; row: number };

export type NpcIdentity = {
    displayName: string;
    role: string;
    look: string;
    speechStyle: string;
    disposition: 'silent' | 'truthful' | 'imprecise' | 'liar' | 'malicious' | 'random';
    settlementKnowledgeRadiusCells?: number;
    sourceTag: string;
};

export type NpcWorldState = {
    npcId: string;
    homeVillageName: string;
    profession: NpcProfession;
    lifeStatus: 'alive' | 'dead';
    identity: NpcIdentity;
    homeCell: NpcGridPosition;
    currentCell: NpcGridPosition;
    route: NpcGridPosition[];
    routeProgressMinutes: number;
    currentTask: NpcTaskKind;
    taskStartedAtMinute: number;
    taskEndsAtMinute: number | null;
    plannedWorkDurationMinutes: number;
    dailyScheduleKey: string;
    dailyTaskSequence: number;
    lastScheduleDay: number;
    herbalistFieldDay: boolean;
};

export type NpcCapabilities = {
    canTalk: boolean;
    canShop: boolean;
    canServeInnMeal: boolean;
    canRentRoom: boolean;
    unavailableReason: NpcUnavailableReason;
};

export type NpcRegistration = {
    npcId: string;
    homeVillageName: string;
    role: string;
    lifeStatus: 'alive' | 'dead';
    homeCell: NpcGridPosition;
    identity: Omit<NpcIdentity, 'role'>;
};

export type NpcNavigationSnapshot = {
    columns: number;
    rows: number;
    traversableCellKeys: string[];
};

export const AVAILABLE_NPC_CAPABILITIES: NpcCapabilities = { canTalk: true, canShop: false, canServeInnMeal: false, canRentRoom: false, unavailableReason: null };
