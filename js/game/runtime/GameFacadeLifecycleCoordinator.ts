/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning */
import { MODES } from '../../systems/game/runtime/GameModeStateMachine.js';
import type { GameFacadeStateAccess } from './GameFacadeSharedTypes.js';
import { getDeveloperModeConfig } from '../../utils/DeveloperModeConfig.js';
import Item from '../../entities/Item.js';

export default class GameFacadeLifecycleCoordinator {
    private readonly state: GameFacadeStateAccess;
    private readonly handleVisibilityChangeBound: () => void;

    public constructor(state: GameFacadeStateAccess) {
        this.state = state;
        this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
    }

    public initializeAfterRuntimeAssignment(): void {
        const isNewGame = this.state.startupState.mode === 'new';
        if (isNewGame) {
            this.state.worldMap.centerOnPlayer();
        }
        this.syncPlayerToWorldMap();
        this.state.worldSimulationRuntime.setNavigationSnapshot(this.state.worldMap.getNpcNavigationSnapshot());
        if (!this.state.worldSimulationRuntime.wasRestoredWithNpcs()) {
            this.state.villageActionsController.resetAndInitializeWorldNpcPopulation();
        }
        this.state.worldSimulationRuntime.reconcileToMinute(this.state.gameTime.getTotalMinutes());
        this.state.villageActionsController.refreshNpcAvailability();
        const developerMode = getDeveloperModeConfig();
        if (isNewGame && developerMode.enabled && developerMode.autoGodBoostOnCharacterCreation) {
            this.state.hudCoordinator.handleGodSkillsBoost();
        }
        this.refreshHud();
        this.refreshGroupPanel();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
            this.state.questRuntime.activeSideQuests,
            this.state.gameTime?.getState(),
            this.state.worldSimulationRuntime.getState(),
        );
    }

    public start(): void {
        this.handleResize();
        this.refreshHud();
        document.addEventListener('visibilitychange', this.handleVisibilityChangeBound);
        this.handleVisibilityChange();
        this.state.loop.start();
    }

    public update(deltaTime: number): void {
        const updateStart = performance.now();
        this.state.stateMachine.update(deltaTime);
        this.state.input.update();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
            this.state.questRuntime.activeSideQuests,
            this.state.gameTime?.getState(),
            this.state.worldSimulationRuntime.getState(),
        );
        this.state.worldMap?.setLastUpdateMs(performance.now() - updateStart);
    }

    public render(): void {
        const nowMs = performance.now();
        if (this.state.stateMachine.isInState(MODES.WORLD_MAP) && this.state.worldMap && !this.state.worldMap.shouldRenderThisFrame(nowMs)) {
            return;
        }
        const renderStart = performance.now();
        this.state.worldMap?.beginRenderFrame(nowMs);
        this.state.renderer.beginFrame();
        if (this.state.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.state.renderRouter.renderWorldMode();
        }
        if (this.state.stateMachine.isInState(MODES.VILLAGE)) {
            this.state.renderRouter.renderVillageMode();
        }
        if (this.state.stateMachine.isInState(MODES.BATTLE)) {
            this.state.renderRouter.renderBattleMode(
                this.state.battleCoordinator.getCurrentEnemies(),
                this.state.battleCoordinator.getCurrentAllies(),
                this.state.battleCoordinator.getSelectedEnemy(),
            );
        }
        this.state.renderer.endFrame();
        this.state.worldMap?.finishRenderFrame(performance.now() - renderStart);
    }

    public gameOver(): void {
        this.state.loop.stop();
        alert('Game Over! A new character will be created.');
        this.startNewCharacter();
    }

    public startNewCharacter(): void {
        this.state.loop.stop();
        this.state.persistenceRuntime.clearAllGameSaves();
        window.location.reload();
    }

    public onGodSkillsBoost(): void {
        this.state.hudCoordinator.handleGodSkillsBoost();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
            this.state.questRuntime.activeSideQuests,
            this.state.gameTime?.getState(),
            this.state.worldSimulationRuntime.getState(),
        );
    }

    public onQuestLocationClick(locationName: string): boolean {
        let shown = this.state.worldMap.revealNamedLocation(locationName);
        if (!shown) {
            this.state.worldMap.registerNamedLocation(locationName);
            shown = this.state.worldMap.revealNamedLocation(locationName);
        }
        if (shown) {
            this.state.stateMachine.transition(MODES.WORLD_MAP);
        }
        return shown;
    }

    public onVillageBarterCompleted(trader: string, item: string, village: string): void {
        const status = this.state.questRuntime.recordBarterCompletion(trader, item, village);
        if (status === 'updated') {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: barter objective completed (${trader} -> ${item}).`, 'system');
        }
        if (status === 'no-objective') {
            this.state.hudCoordinator.addBattleLog(
                `Quest tracker: barter registered (${trader} -> ${item}), but no active objective matched.`,
                'system-message',
            );
        }
    }

    public onMonsterKilled(monsterName: string): void {
        if (this.state.questRuntime.recordMonsterKill(monsterName)) {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: eliminated ${monsterName}.`, 'system');
        }
    }

    public onTryRecruitEscort(personName: string, villageName: string): 'joined' | 'inactive' | 'already-joined' | 'not-available' {
        const status = this.state.questRuntime.recruitEscort(personName, villageName);
        if (status === 'joined') {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: ${personName} joined your group in ${villageName}.`, 'system');
            this.refreshGroupPanel();
        }
        return status;
    }

    public onRevealRecoverHolder = (villageName: string, npcName: string): { revealed: boolean; personName?: string; itemName?: string } => (
        this.state.questRuntime.revealRecoverHolder(villageName, npcName)
    );

    public onTryStartRecoverConfrontation = (
        personName: string,
        villageName: string,
    ): { status: 'started' | 'inactive' | 'not-target' | 'not-ready'; enemies?: import('../../entities/Skeleton.js').default[]; itemName?: string } => (
        this.state.questRuntime.startRecoverConfrontation(personName, villageName)
    );

    public onBattleEnded(result: 'victory' | 'defeat' | 'fled'): void {
        if (result !== 'victory' && result !== 'fled') {
            return;
        }
        const battleContext = this.state.battleCoordinator.getBattleContext();
        if (battleContext.kind === 'village-defense' && battleContext.villageName) {
            const survivors = this.state.battleCoordinator.getCurrentAllies()
                .filter((ally) => !ally.isDead())
                .map((ally) => ({ name: ally.name, hp: ally.hp, maxHp: ally.maxHp }));
            const casualtyLines = this.state.questRuntime.applyDefenderBattleResults(battleContext.villageName, survivors);
            casualtyLines.forEach((line) => this.state.hudCoordinator.addBattleLog(line, 'system-message'));
        }
        const lines = this.state.questRuntime.resolveRecoverBattle(result, this.state.worldMap, this.state.player);
        lines.forEach((line, index) => this.state.hudCoordinator.addBattleLog(line, index === 0 ? 'system' : 'system-message'));
        if (lines.length > 0) {
            this.refreshGroupPanel();
        }
    }

    public onVillageAdvanceTime(minutes: number, fatigueScale: number): void {
        this.state.advanceTime(minutes, fatigueScale);
        const villageName = this.state.villageCoordinator.getVillageName();
        const defenseTick = this.state.questRuntime.onVillageTimeAdvanced(villageName, minutes);
        defenseTick.logs.forEach((line) => this.state.hudCoordinator.addBattleLog(line, 'system-message'));
        if (!defenseTick.triggeredBattle || !defenseTick.attackers) {
            return;
        }
        this.state.hudCoordinator.addBattleLog('Village defense combat starts!', 'system');
        this.state.stateMachine.transition(MODES.BATTLE, {
            enemies: defenseTick.attackers,
            allies: defenseTick.allies ?? [],
            terrainType: 'grass',
            battleKind: 'village-defense',
            villageName,
        });
    }

    public onTryStartDefendObjective = (
        npcName: string,
        villageName: string,
        villagerNames: string[],
    ): { status: 'started' | 'inactive' | 'not-target' | 'already-active'; objectiveTitle?: string; days?: number } =>
        this.state.questRuntime.tryStartDefendObjective(villageName, npcName, villagerNames);

    public onVillageEntered(): void {
        const villageName = this.state.worldMap.getVillageNameAtPlayerPosition();
        const questUpdate = this.state.questRuntime.recordLocationEntry(
            villageName,
            this.state.player.getInventory().map((item) => item.name),
            (item) => this.awardRecoveredQuestItem(item, villageName),
        );
        questUpdate.logs.forEach((line) => this.state.hudCoordinator.addBattleLog(line, 'system-message'));
        if (questUpdate.changed) {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: objectives updated at ${villageName}.`, 'system');
            this.refreshHud();
        }
        this.refreshGroupPanel();
        this.state.villageCoordinator.enterVillageMode(
            this.state.canvas.width,
            this.state.canvas.height,
            villageName,
        );
    }

    public handleResize = (): void => {
        const rect = this.state.canvas.getBoundingClientRect();
        const dpr = this.state.worldMap?.getEffectiveDevicePixelRatio(window.devicePixelRatio || 1) ?? (window.devicePixelRatio || 1);
        const width = Math.max(160, Math.floor(rect.width * dpr));
        const height = Math.max(160, Math.floor(rect.height * dpr));
        if (width !== this.state.canvas.width || height !== this.state.canvas.height) {
            this.state.canvas.width = width;
            this.state.canvas.height = height;
            this.state.worldMap?.setCanvasPixelSize(width, height);
        }
        if (!this.state.worldMap || !this.state.battleMap) {
            return;
        }
        this.state.worldMap.resizeToCanvas(width, height);
        this.state.battleMap.resizeToCanvas(width, height);
        this.syncPlayerToWorldMap();
    };

    private refreshGroupPanel(): void {
        const members = this.state.questRuntime.getGroupMembers();
        const lines = members.map((member) => `${member.name} — HP ${member.hp}/${member.maxHp} (${member.status})`);
        this.state.hudCoordinator.updateGroupPanel(lines);
    }

    private awardRecoveredQuestItem(item: Item, villageName: string): boolean {
        const beforeInventory = this.state.player.getInventory();
        const hadItemBefore = beforeInventory.some((entry) => entry.name === item.name);
        const wasAdded = this.state.player.addItemToInventory(item);
        const hasItemAfterFirstAttempt = this.state.player.getInventory().some((entry) => entry.name === item.name);
        if (!hadItemBefore && wasAdded && !hasItemAfterFirstAttempt) {
            const fallbackAdded = this.state.player.addItemToInventory(item);
            const hasItemAfterFallback = this.state.player.getInventory().some((entry) => entry.name === item.name);
            if (!fallbackAdded || !hasItemAfterFallback) {
                this.state.hudCoordinator.addBattleLog(`Quest tracker: failed to persist recovered item ${item.name} at ${villageName}.`, 'system-message');
                return false;
            }
            return true;
        }
        return wasAdded && hasItemAfterFirstAttempt;
    }

    private refreshHud(): void {
        if (!this.state.hudCoordinator) {
            return;
        }
        this.state.hudCoordinator.updateHUD();
        this.state.hudCoordinator.updateSelectedCell(this.state.worldMap.getSelectedCellInfo());
    }

    private syncPlayerToWorldMap(): void {
        const [x, y] = this.state.worldMap.getPlayerPixelPosition();
        this.state.player.x = x;
        this.state.player.y = y;
    }

    private handleVisibilityChange(): void {
        const hidden = typeof document !== 'undefined' && document.hidden;
        this.state.worldMap?.setRenderVisibilityState(hidden);
        if (hidden) {
            this.state.loop.pause('tab-hidden');
            return;
        }
        if (this.state.loop.resume()) {
            this.state.hudCoordinator.updateSelectedCell(this.state.worldMap.getSelectedCellInfo());
        }
    }

    public onVillageLeave(): void {
        const villageName = this.state.villageCoordinator.getVillageName();
        const rollbackLines = this.state.questRuntime.rollbackDefendObjectivesForVillage(villageName);
        rollbackLines.forEach((line) => this.state.hudCoordinator.addBattleLog(line, 'system-message'));
        this.state.stateMachine.transition(MODES.WORLD_MAP);
    }
}
