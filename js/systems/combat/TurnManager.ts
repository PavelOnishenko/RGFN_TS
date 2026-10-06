import { CombatEntity } from '../../types/game.js';

export default class TurnManager {
    private entities: CombatEntity[];
    private currentTurnIndex: number;
    private consumedTurnCountsByEntityId: Map<number, number>;
    private teamByEntityId: Map<number, 'player' | 'enemy'>;
    private playerEntityId: number | null;
    public waitingForPlayer: boolean;

    constructor() {
        this.entities = [];
        this.currentTurnIndex = 0;
        this.consumedTurnCountsByEntityId = new Map();
        this.teamByEntityId = new Map();
        this.playerEntityId = null;
        this.waitingForPlayer = false;
    }

    public initializeTurns(entities: CombatEntity[], teams?: { player: CombatEntity; allies?: CombatEntity[]; enemies?: CombatEntity[] }): void {
        this.entities = entities.filter(e => e.active && !e.isDead());
        this.currentTurnIndex = 0;
        this.consumedTurnCountsByEntityId.clear();
        this.teamByEntityId.clear();
        const fallbackPlayer = this.entities.find((entity) => entity.constructor.name === 'Player');
        this.playerEntityId = teams?.player?.id ?? fallbackPlayer?.id ?? null;
        if (teams?.player) {
            this.teamByEntityId.set(teams.player.id, 'player');
        }
        (teams?.allies ?? []).forEach((ally) => this.teamByEntityId.set(ally.id, 'player'));
        (teams?.enemies ?? []).forEach((enemy) => this.teamByEntityId.set(enemy.id, 'enemy'));
        this.entities
            .filter((entity) => !this.teamByEntityId.has(entity.id))
            .forEach((entity) => this.teamByEntityId.set(entity.id, entity.constructor.name === 'Player' ? 'player' : 'enemy'));
        this.waitingForPlayer = false;
    }

    public getCurrentEntity(): CombatEntity | null {
        if (this.currentTurnIndex >= this.entities.length) {
            return null;
        }
        return this.entities[this.currentTurnIndex];
    }

    public isPlayerTurn(): boolean {
        const current = this.getCurrentEntity();
        return current !== null && this.playerEntityId !== null && current.id === this.playerEntityId;
    }

    public nextTurn(): CombatEntity | null {
        // Remove dead entities
        this.entities = this.entities.filter(e => e.active && !e.isDead());
        this.consumedTurnCountsByEntityId = new Map(
            [...this.consumedTurnCountsByEntityId.entries()]
                .filter(([entityId]) => this.entities.some((entity) => entity.id === entityId))
        );

        if (this.entities.length === 0) {
            return null;
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.entities.length;
        this.waitingForPlayer = this.isPlayerTurn();

        return this.getCurrentEntity();
    }

    public consumeUpcomingTurn(entity: CombatEntity): void {
        this.consumeUpcomingTurns(entity, 1);
    }

    public consumeUpcomingTurns(entity: CombatEntity, turns: number): void {
        if (!entity.active || entity.isDead()) {
            return;
        }

        const turnsToConsume = Number.isFinite(turns) ? Math.max(0, Math.floor(turns)) : 0;
        if (turnsToConsume <= 0) {
            return;
        }

        const alreadyConsumed = this.consumedTurnCountsByEntityId.get(entity.id) ?? 0;
        this.consumedTurnCountsByEntityId.set(entity.id, alreadyConsumed + turnsToConsume);
    }

    public shouldSkipCurrentTurn(): boolean {
        const current = this.getCurrentEntity();
        return current !== null && (this.consumedTurnCountsByEntityId.get(current.id) ?? 0) > 0;
    }

    public clearCurrentTurnConsumption(): void {
        const current = this.getCurrentEntity();
        if (!current) {
            return;
        }

        const remaining = (this.consumedTurnCountsByEntityId.get(current.id) ?? 0) - 1;
        if (remaining > 0) {
            this.consumedTurnCountsByEntityId.set(current.id, remaining);
            return;
        }

        this.consumedTurnCountsByEntityId.delete(current.id);
    }

    public hasActiveCombatants(): boolean {
        const players = this.entities.filter((entity) => !entity.isDead() && this.getTeam(entity) === 'player');
        const enemies = this.entities.filter((entity) => !entity.isDead() && this.getTeam(entity) === 'enemy');
        return players.length > 0 && enemies.length > 0;
    }

    public getActiveEnemies = (): CombatEntity[] => this.entities.filter((entity) => this.getTeam(entity) === 'enemy' && !entity.isDead());

    public getOpponentsOf(entity: CombatEntity): CombatEntity[] {
        const team = this.getTeam(entity);
        return this.entities.filter((candidate) => this.getTeam(candidate) !== team && !candidate.isDead());
    }

    public isAlly(entity: CombatEntity): boolean {
        if (this.playerEntityId === null) {
            return false;
        }
        return this.getTeam(entity) === 'player' && entity.id !== this.playerEntityId;
    }

    public getPlayerSideParticipantCount = (): number => this.entities.filter((entity) => this.getTeam(entity) === 'player' && !entity.isDead()).length;

    private getTeam = (entity: CombatEntity): 'player' | 'enemy' => this.teamByEntityId.get(entity.id) ?? (entity.constructor.name === 'Player' ? 'player' : 'enemy');
}
