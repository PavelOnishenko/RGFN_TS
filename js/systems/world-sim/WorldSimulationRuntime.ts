/* eslint-disable style-guide/file-length-warning */
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import {
    NpcCapabilities,
    NpcGridPosition,
    NpcNavigationSnapshot,
    NpcProfession,
    NpcRegistration,
    NpcTaskKind,
    NpcWorldState,
} from './npc/NpcTaskTypes.js';

export type WorldSimulationStage = 'taskAssign' | 'movement' | 'taskProgress' | 'conflicts' | 'villages';

export type WorldSimulationState = {
    worldTick: number;
    lastDelta: number;
    pendingEvents: string[];
    lastStageOrder: WorldSimulationStage[];
    simulatedToMinute: number;
    npcs: Record<string, NpcWorldState>;
};

type PartialState = Partial<WorldSimulationState> | null | undefined;

const MINUTES_PER_DAY = 24 * 60;
const PIPELINE: WorldSimulationStage[] = ['taskAssign', 'movement', 'taskProgress', 'conflicts', 'villages'];
const createDefaultState = (): WorldSimulationState => ({ worldTick: 0, lastDelta: 0, pendingEvents: [], lastStageOrder: [], simulatedToMinute: 0, npcs: {} });
const ensureNonNegativeFinite = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};
const clonePosition = (position: NpcGridPosition): NpcGridPosition => ({ col: position.col, row: position.row });
const samePosition = (left: NpcGridPosition, right: NpcGridPosition): boolean => left.col === right.col && left.row === right.row;
const positionKey = (position: NpcGridPosition): string => `${position.col},${position.row}`;

export default class WorldSimulationRuntime {
    private state: WorldSimulationState = createDefaultState();
    private navigation: NpcNavigationSnapshot | null = null;
    private traversableCellKeys: Set<string> = new Set();
    private restoredWithNpcs = false;

    public initialize(initialState?: PartialState): void {
        this.state = createDefaultState();
        this.restoreState(initialState);
        this.restoredWithNpcs = Object.keys(this.state.npcs).length > 0;
    }

    public setNavigationSnapshot(snapshot: NpcNavigationSnapshot): void {
        this.navigation = {
            columns: Math.max(1, Math.floor(snapshot.columns)),
            rows: Math.max(1, Math.floor(snapshot.rows)),
            traversableCellKeys: [...snapshot.traversableCellKeys],
        };
        this.traversableCellKeys = new Set(this.navigation.traversableCellKeys);
    }

    public upsertNpc(registration: NpcRegistration): void {
        const existing = this.state.npcs[registration.npcId];
        if (existing) {
            existing.homeVillageName = registration.homeVillageName;
            existing.lifeStatus = registration.lifeStatus;
            existing.identity = { ...registration.identity, role: registration.role };
            existing.profession = this.resolveProfession(registration.role);
            existing.homeCell = clonePosition(registration.homeCell);
            if (registration.lifeStatus === 'dead') {
                existing.route = [];
            }
            return;
        }

        const homeCell = clonePosition(registration.homeCell);
        this.state.npcs[registration.npcId] = {
            npcId: registration.npcId,
            homeVillageName: registration.homeVillageName,
            profession: this.resolveProfession(registration.role),
            lifeStatus: registration.lifeStatus,
            identity: { ...registration.identity, role: registration.role },
            homeCell,
            currentCell: clonePosition(homeCell),
            route: [],
            routeProgressMinutes: 0,
            currentTask: 'idleAtHome',
            taskStartedAtMinute: this.state.simulatedToMinute,
            taskEndsAtMinute: null,
            plannedWorkDurationMinutes: 0,
            dailyScheduleKey: '',
            dailyTaskSequence: 0,
            lastScheduleDay: -1,
            herbalistFieldDay: false,
        };
    }

    public clearNpcs(): void {
        this.state.npcs = {};
        this.restoredWithNpcs = false;
    }

    public tick(deltaMinutes: number, absoluteTotalMinutes?: number): WorldSimulationState {
        const safeDelta = ensureNonNegativeFinite(deltaMinutes);
        const requestedTarget = absoluteTotalMinutes === undefined
            ? this.state.simulatedToMinute + Math.round(safeDelta)
            : Math.floor(ensureNonNegativeFinite(absoluteTotalMinutes));
        this.state.worldTick += 1;
        this.state.lastDelta = safeDelta;
        this.state.lastStageOrder = [...PIPELINE];

        if (requestedTarget < this.state.simulatedToMinute) {
            this.state.simulatedToMinute = requestedTarget;
            Object.values(this.state.npcs).forEach((npc) => this.reconcileNpcAtMinute(npc, requestedTarget));
        } else {
            for (let minute = this.state.simulatedToMinute + 1; minute <= requestedTarget; minute += 1) {
                Object.values(this.state.npcs).forEach((npc) => this.processNpcMinute(npc, minute));
            }
            this.state.simulatedToMinute = requestedTarget;
        }

        PIPELINE.forEach((stage) => this.enqueueEvent(this.describeStage(stage, safeDelta)));
        return this.getState();
    }

    public reconcileToMinute(totalMinutes: number): void {
        this.tick(Math.max(0, totalMinutes - this.state.simulatedToMinute), totalMinutes);
    }

    public getNpcCapabilities(npcId: string, currentVillageName: string): NpcCapabilities {
        const npc = this.state.npcs[npcId];
        if (!npc || npc.lifeStatus === 'dead') {
            return { canTalk: false, canShop: false, canServeInnMeal: false, canRentRoom: false, unavailableReason: 'dead' };
        }
        if (npc.currentTask === 'sleep') {
            return { canTalk: false, canShop: false, canServeInnMeal: false, canRentRoom: false, unavailableReason: 'sleeping' };
        }
        const isAtHome = samePosition(npc.currentCell, npc.homeCell)
            && npc.homeVillageName.trim().toLocaleLowerCase() === currentVillageName.trim().toLocaleLowerCase();
        const isOutdoorTask = npc.currentTask === 'travelToWork' || npc.currentTask === 'returnHome'
            || npc.currentTask === 'hunt' || npc.currentTask === 'gatherHerbs';
        if (!isAtHome || isOutdoorTask) {
            return { canTalk: false, canShop: false, canServeInnMeal: false, canRentRoom: false, unavailableReason: 'away' };
        }
        if (npc.currentTask === 'mill' || npc.currentTask === 'carpentry') {
            return { canTalk: false, canShop: false, canServeInnMeal: false, canRentRoom: false, unavailableReason: 'working' };
        }
        return {
            canTalk: true,
            canShop: npc.profession === 'trader' && npc.currentTask === 'operateShop',
            canServeInnMeal: npc.profession === 'innkeeper' && npc.currentTask === 'operateInn',
            canRentRoom: npc.profession === 'innkeeper' && npc.currentTask === 'operateInn',
            unavailableReason: null,
        };
    }

    public readonly wasRestoredWithNpcs = (): boolean => this.restoredWithNpcs;
    public readonly getNpcStates = (): NpcWorldState[] => Object.values(this.state.npcs).map((npc) => this.cloneNpc(npc));
    public getNpcState = (npcId: string): NpcWorldState | null => {
        const npc = this.state.npcs[npcId];
        return npc ? this.cloneNpc(npc) : null;
    };
    public readonly getState = (): WorldSimulationState => ({
        worldTick: this.state.worldTick,
        lastDelta: this.state.lastDelta,
        pendingEvents: [...this.state.pendingEvents],
        lastStageOrder: [...this.state.lastStageOrder],
        simulatedToMinute: this.state.simulatedToMinute,
        npcs: Object.fromEntries(Object.entries(this.state.npcs).map(([id, npc]) => [id, this.cloneNpc(npc)])),
    });

    public restoreState(nextState?: PartialState): void {
        if (!nextState || typeof nextState !== 'object') {return;}
        this.state.worldTick = Math.floor(ensureNonNegativeFinite(nextState.worldTick));
        this.state.lastDelta = ensureNonNegativeFinite(nextState.lastDelta);
        this.state.simulatedToMinute = Math.floor(ensureNonNegativeFinite(nextState.simulatedToMinute));
        this.state.pendingEvents = this.sanitizePendingEvents(nextState.pendingEvents);
        this.state.lastStageOrder = this.sanitizeStageOrder(nextState.lastStageOrder);
        this.state.npcs = this.sanitizeNpcs(nextState.npcs);
    }

    private processNpcMinute(npc: NpcWorldState, absoluteMinute: number): void {
        if (npc.lifeStatus === 'dead') {return;}
        this.prepareDailySchedule(npc, absoluteMinute);
        const minuteOfDay = absoluteMinute % MINUTES_PER_DAY;
        const config = balanceConfig.npcTasks;
        if (minuteOfDay >= config.sleepStartMinute || minuteOfDay < config.wakeMinute) {
            this.setTask(npc, 'sleep', absoluteMinute, null);
            npc.route = [];
            npc.routeProgressMinutes = 0;
            return;
        }
        if (npc.profession === 'hunter') {
            this.processFieldWorker(npc, absoluteMinute, config.hunter, 'hunt');
            return;
        }
        if (npc.profession === 'herbalist' && npc.herbalistFieldDay) {
            this.processFieldWorker(npc, absoluteMinute, config.herbalist, 'gatherHerbs');
            return;
        }
        this.processVillageWorker(npc, absoluteMinute);
    }

    private processVillageWorker(npc: NpcWorldState, absoluteMinute: number): void {
        const minuteOfDay = absoluteMinute % MINUTES_PER_DAY;
        if (!samePosition(npc.currentCell, npc.homeCell)) {
            this.ensureReturnRoute(npc, absoluteMinute);
            this.progressMovement(npc, absoluteMinute, 'idleAtHome');
            return;
        }
        const config = balanceConfig.npcTasks;
        const workTaskByProfession: Partial<Record<NpcProfession, { task: NpcTaskKind; start: number; end: number }>> = {
            trader: { task: 'operateShop', start: config.trader.workStartMinute, end: config.trader.workEndMinute },
            miller: { task: 'mill', start: config.miller.workStartMinute, end: config.miller.workEndMinute },
            carpenter: { task: 'carpentry', start: config.carpenter.workStartMinute, end: config.carpenter.workEndMinute },
            innkeeper: { task: 'operateInn', start: config.innkeeper.workStartMinute, end: config.innkeeper.workEndMinute },
            herbalist: { task: 'processHerbs', start: config.herbalist.workStartMinute, end: config.herbalist.villageWorkEndMinute },
        };
        if (npc.profession === 'guard') {
            this.setTask(npc, 'guardVillage', absoluteMinute, config.sleepStartMinute + (Math.floor(absoluteMinute / MINUTES_PER_DAY) * MINUTES_PER_DAY));
            return;
        }
        const work = workTaskByProfession[npc.profession];
        if (work && minuteOfDay >= work.start && minuteOfDay < work.end) {
            this.setTask(npc, work.task, absoluteMinute, (Math.floor(absoluteMinute / MINUTES_PER_DAY) * MINUTES_PER_DAY) + work.end);
            return;
        }
        this.setTask(npc, npc.profession === 'resident' ? 'villageChores' : 'idleAtHome', absoluteMinute, null);
    }

    private processFieldWorker(
        npc: NpcWorldState,
        absoluteMinute: number,
        config: { rangeCells: number; workStartMinute: number; expeditionEndMinute: number; workDurationMinMinutes: number; workDurationMaxMinutes: number },
        workTask: 'hunt' | 'gatherHerbs',
    ): void {
        const minuteOfDay = absoluteMinute % MINUTES_PER_DAY;
        if (minuteOfDay < config.workStartMinute) {
            if (!samePosition(npc.currentCell, npc.homeCell)) {
                this.ensureReturnRoute(npc, absoluteMinute);
                this.progressMovement(npc, absoluteMinute, 'idleAtHome');
            } else {
                this.setTask(npc, 'idleAtHome', absoluteMinute, null);
            }
            return;
        }
        if (minuteOfDay >= config.expeditionEndMinute) {
            if (samePosition(npc.currentCell, npc.homeCell)) {
                this.setTask(npc, 'idleAtHome', absoluteMinute, null);
            } else {
                this.ensureReturnRoute(npc, absoluteMinute);
                this.progressMovement(npc, absoluteMinute, 'idleAtHome');
            }
            return;
        }
        if (npc.currentTask === 'travelToWork') {
            this.progressMovement(npc, absoluteMinute, workTask);
            return;
        }
        if (npc.currentTask === workTask && (npc.taskEndsAtMinute ?? absoluteMinute + 1) > absoluteMinute) {return;}
        this.assignFieldDestination(npc, absoluteMinute, config.rangeCells, config.workDurationMinMinutes, config.workDurationMaxMinutes, workTask);
    }

    private assignFieldDestination(
        npc: NpcWorldState,
        absoluteMinute: number,
        rangeCells: number,
        minWorkMinutes: number,
        maxWorkMinutes: number,
        workTask: 'hunt' | 'gatherHerbs',
    ): void {
        const candidates = this.getFieldCandidates(npc.homeCell, rangeCells);
        if (candidates.length === 0) {
            this.setTask(npc, 'idleAtHome', absoluteMinute, null);
            return;
        }
        const startIndex = this.hashToInt(`${npc.npcId}:${npc.lastScheduleDay}:${npc.dailyTaskSequence}:destination`, candidates.length);
        for (let offset = 0; offset < candidates.length; offset += 1) {
            const target = candidates[(startIndex + offset) % candidates.length];
            const path = this.buildPath(
                npc.currentCell,
                target,
                (position) => Math.hypot(position.col - npc.homeCell.col, position.row - npc.homeCell.row) <= rangeCells,
            );
            if (path.length < 2) {continue;}
            npc.dailyTaskSequence += 1;
            npc.route = path.slice(1);
            npc.routeProgressMinutes = 0;
            const duration = minWorkMinutes + this.hashToInt(
                `${npc.npcId}:${npc.lastScheduleDay}:${npc.dailyTaskSequence}:duration`,
                Math.max(1, maxWorkMinutes - minWorkMinutes + 1),
            );
            npc.plannedWorkDurationMinutes = duration;
            this.setTask(npc, 'travelToWork', absoluteMinute, null);
            return;
        }
        this.setTask(npc, workTask, absoluteMinute, absoluteMinute + minWorkMinutes);
    }

    private progressMovement(npc: NpcWorldState, absoluteMinute: number, arrivalTask: NpcTaskKind): void {
        if (npc.route.length === 0) {
            const endsAt = arrivalTask === 'hunt' || arrivalTask === 'gatherHerbs'
                ? absoluteMinute + npc.plannedWorkDurationMinutes
                : null;
            this.setTask(npc, arrivalTask, absoluteMinute, endsAt);
            return;
        }
        npc.routeProgressMinutes += 1;
        const minutesPerCell = 60 / Math.max(0.1, balanceConfig.npcTasks.travelSpeedCellsPerHour);
        if (npc.routeProgressMinutes < minutesPerCell) {return;}
        npc.routeProgressMinutes -= minutesPerCell;
        const nextCell = npc.route.shift();
        if (nextCell) {npc.currentCell = clonePosition(nextCell);}
        if (npc.route.length === 0) {
            const endsAt = arrivalTask === 'hunt' || arrivalTask === 'gatherHerbs'
                ? absoluteMinute + npc.plannedWorkDurationMinutes
                : null;
            this.setTask(npc, arrivalTask, absoluteMinute, endsAt);
        }
    }

    private ensureReturnRoute(npc: NpcWorldState, absoluteMinute: number): void {
        if (npc.currentTask === 'returnHome' && npc.route.length > 0) {return;}
        const rangeCells = npc.profession === 'hunter'
            ? balanceConfig.npcTasks.hunter.rangeCells
            : npc.profession === 'herbalist' ? balanceConfig.npcTasks.herbalist.rangeCells : Number.POSITIVE_INFINITY;
        npc.route = this.buildPath(
            npc.currentCell,
            npc.homeCell,
            (position) => Math.hypot(position.col - npc.homeCell.col, position.row - npc.homeCell.row) <= rangeCells,
        ).slice(1);
        npc.routeProgressMinutes = 0;
        this.setTask(npc, 'returnHome', absoluteMinute, null);
    }

    private getFieldCandidates(home: NpcGridPosition, rangeCells: number): NpcGridPosition[] {
        if (!this.navigation) {return [];}
        const candidates: NpcGridPosition[] = [];
        for (let row = Math.max(0, home.row - rangeCells); row <= Math.min(this.navigation.rows - 1, home.row + rangeCells); row += 1) {
            for (let col = Math.max(0, home.col - rangeCells); col <= Math.min(this.navigation.columns - 1, home.col + rangeCells); col += 1) {
                const candidate = { col, row };
                const distance = Math.hypot(col - home.col, row - home.row);
                if (distance > 0 && distance <= rangeCells && this.traversableCellKeys.has(positionKey(candidate))) {candidates.push(candidate);}
            }
        }
        return candidates;
    }

    private buildPath(start: NpcGridPosition, target: NpcGridPosition, isAllowed: (position: NpcGridPosition) => boolean = () => true): NpcGridPosition[] {
        if (!this.navigation || !this.traversableCellKeys.has(positionKey(target))) {return [];}
        if (samePosition(start, target)) {return [clonePosition(start)];}
        const queue: NpcGridPosition[] = [clonePosition(start)];
        const previous = new Map<string, string | null>([[positionKey(start), null]]);
        let queueIndex = 0;
        while (queueIndex < queue.length) {
            const current = queue[queueIndex++];
            for (const neighbor of this.getNeighbors(current)) {
                const key = positionKey(neighbor);
                if (previous.has(key) || !this.traversableCellKeys.has(key) || !isAllowed(neighbor)) {continue;}
                previous.set(key, positionKey(current));
                if (samePosition(neighbor, target)) {return this.reconstructPath(previous, start, target);}
                queue.push(neighbor);
            }
        }
        return [];
    }

    private getNeighbors(position: NpcGridPosition): NpcGridPosition[] {
        if (!this.navigation) {return [];}
        const neighbors: NpcGridPosition[] = [];
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
            for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
                if (colOffset === 0 && rowOffset === 0) {continue;}
                const col = position.col + colOffset;
                const row = position.row + rowOffset;
                if (col >= 0 && row >= 0 && col < this.navigation.columns && row < this.navigation.rows) {neighbors.push({ col, row });}
            }
        }
        return neighbors;
    }

    private reconstructPath(previous: Map<string, string | null>, start: NpcGridPosition, target: NpcGridPosition): NpcGridPosition[] {
        const keys: string[] = [positionKey(target)];
        let cursor = previous.get(keys[0]) ?? null;
        while (cursor) {
            keys.push(cursor);
            cursor = previous.get(cursor) ?? null;
        }
        keys.reverse();
        if (keys[0] !== positionKey(start)) {return [];}
        return keys.map((key) => {
            const [col, row] = key.split(',').map(Number);
            return { col, row };
        });
    }

    private prepareDailySchedule(npc: NpcWorldState, absoluteMinute: number): void {
        const day = Math.floor(absoluteMinute / MINUTES_PER_DAY);
        if (day === npc.lastScheduleDay) {return;}
        npc.lastScheduleDay = day;
        npc.dailyTaskSequence = 0;
        npc.herbalistFieldDay = npc.profession === 'herbalist'
            && this.hashToUnit(`${npc.npcId}:${day}:herbalist-field-day`) < balanceConfig.npcTasks.herbalist.fieldDayChance;
        npc.dailyScheduleKey = `${day}:${npc.herbalistFieldDay ? 'field' : 'village'}`;
    }

    private reconcileNpcAtMinute(npc: NpcWorldState, absoluteMinute: number): void {
        npc.route = [];
        npc.routeProgressMinutes = 0;
        npc.currentCell = clonePosition(npc.homeCell);
        this.processNpcMinute(npc, absoluteMinute);
    }

    private setTask(npc: NpcWorldState, task: NpcTaskKind, absoluteMinute: number, endsAt: number | null): void {
        if (npc.currentTask !== task) {
            npc.currentTask = task;
            npc.taskStartedAtMinute = absoluteMinute;
        }
        npc.taskEndsAtMinute = endsAt;
    }

    private resolveProfession(role: string): NpcProfession {
        const normalized = role.trim().toLocaleLowerCase();
        if (normalized.includes('hunter')) {return 'hunter';}
        if (normalized.includes('herbalist')) {return 'herbalist';}
        if (normalized.includes('miller')) {return 'miller';}
        if (normalized.includes('carpenter')) {return 'carpenter';}
        if (normalized.includes('guard')) {return 'guard';}
        if (normalized.includes('innkeeper') || normalized.includes('tavern') || normalized.includes('host')) {return 'innkeeper';}
        if (normalized.includes('trader') || normalized.includes('barter') || normalized.includes('merchant')) {return 'trader';}
        return 'resident';
    }

    private describeStage(stage: WorldSimulationStage, deltaMinutes: number): string {
        const labels: Record<WorldSimulationStage, string> = {
            taskAssign: `taskAssign:tick-${this.state.worldTick}`,
            movement: `movement:${deltaMinutes.toFixed(2)}`,
            taskProgress: `taskProgress:${deltaMinutes.toFixed(2)}`,
            conflicts: `conflicts:scan-${this.state.worldTick}`,
            villages: `villages:update-${this.state.worldTick}`,
        };
        return labels[stage];
    }

    private enqueueEvent(eventLabel: string): void {
        this.state.pendingEvents.push(eventLabel);
        if (this.state.pendingEvents.length > 64) {this.state.pendingEvents = this.state.pendingEvents.slice(-64);}
    }

    private sanitizePendingEvents(events: unknown): string[] {
        if (!Array.isArray(events)) {return [];}
        return events.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 64);
    }

    private sanitizeStageOrder(stages: unknown): WorldSimulationStage[] {
        if (!Array.isArray(stages)) {return [];}
        return stages.filter((stage): stage is WorldSimulationStage => PIPELINE.includes(stage as WorldSimulationStage));
    }

    private sanitizeNpcs(value: unknown): Record<string, NpcWorldState> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {return {};}
        return Object.entries(value as Record<string, unknown>).reduce((result, [id, raw]) => {
            const npc = this.sanitizeNpc(id, raw);
            if (npc) {result[id] = npc;}
            return result;
        }, {} as Record<string, NpcWorldState>);
    }

    private sanitizeNpc(id: string, raw: unknown): NpcWorldState | null {
        if (!raw || typeof raw !== 'object') {return null;}
        const source = raw as Partial<NpcWorldState>;
        if (!source.identity || !source.homeCell || !source.currentCell || typeof source.homeVillageName !== 'string') {return null;}
        return {
            npcId: id,
            homeVillageName: source.homeVillageName,
            profession: source.profession ?? this.resolveProfession(source.identity.role ?? ''),
            lifeStatus: source.lifeStatus === 'dead' ? 'dead' : 'alive',
            identity: { ...source.identity },
            homeCell: clonePosition(source.homeCell),
            currentCell: clonePosition(source.currentCell),
            route: Array.isArray(source.route) ? source.route.map(clonePosition) : [],
            routeProgressMinutes: ensureNonNegativeFinite(source.routeProgressMinutes),
            currentTask: source.currentTask ?? 'idleAtHome',
            taskStartedAtMinute: Math.floor(ensureNonNegativeFinite(source.taskStartedAtMinute)),
            taskEndsAtMinute: typeof source.taskEndsAtMinute === 'number' ? source.taskEndsAtMinute : null,
            plannedWorkDurationMinutes: ensureNonNegativeFinite(source.plannedWorkDurationMinutes),
            dailyScheduleKey: source.dailyScheduleKey ?? '',
            dailyTaskSequence: Math.floor(ensureNonNegativeFinite(source.dailyTaskSequence)),
            lastScheduleDay: typeof source.lastScheduleDay === 'number' ? Math.floor(source.lastScheduleDay) : -1,
            herbalistFieldDay: Boolean(source.herbalistFieldDay),
        };
    }

    private readonly cloneNpc = (npc: NpcWorldState): NpcWorldState => ({
        ...npc,
        identity: { ...npc.identity },
        homeCell: clonePosition(npc.homeCell),
        currentCell: clonePosition(npc.currentCell),
        route: npc.route.map(clonePosition),
    });

    private hashToInt(input: string, maxExclusive: number): number {
        if (maxExclusive <= 1) {return 0;}
        return Math.floor(this.hashToUnit(input) * maxExclusive);
    }

    private hashToUnit(input: string): number {
        let hash = 2166136261;
        for (let index = 0; index < input.length; index += 1) {
            hash ^= input.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0) / 0x100000000;
    }
}
