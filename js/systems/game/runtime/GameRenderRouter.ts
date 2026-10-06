import Renderer from '../../../core/Renderer.js';
import BattleMap from '../../combat/BattleMap.js';
import WorldMap from '../../world/worldMap/WorldMap.js';
import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';
import TurnManager from '../../combat/TurnManager.js';
import VillageEnvironmentRenderer from '../../village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from '../../village/life/VillageLifeRenderer.js';
import { theme } from '../../../config/ThemeConfig.js';

type RenderDependencies = {
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    worldMap: WorldMap;
    player: Player;
    battleMap: BattleMap;
    turnManager: TurnManager;
    villageEnvironmentRenderer: VillageEnvironmentRenderer;
    villageLifeRenderer: VillageLifeRenderer;
};

export default class GameRenderRouter {
    private readonly deps: RenderDependencies;

    constructor(deps: RenderDependencies) {
        this.deps = deps;
    }

    public renderWorldMode(): void {
        this.deps.worldMap.draw(this.deps.renderer.ctx, this.deps.renderer);
        this.deps.player.draw(this.deps.renderer.ctx);
    }

    public renderVillageMode(): void {
        const time = performance.now() * 0.001;
        const ctx = this.deps.renderer.ctx;
        const width = this.deps.canvas.width;
        const height = this.deps.canvas.height;
        this.deps.villageEnvironmentRenderer.render(ctx, width, height, time);
        this.deps.villageLifeRenderer.update(time);
        this.deps.villageLifeRenderer.render(ctx, time);
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.font = 'bold 34px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.deps.villageLifeRenderer.getVillageName(), width * 0.5, 20);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    public renderBattleMode(enemies: Skeleton[], allies: Skeleton[], selectedEnemy: Skeleton | null): void {
        const currentEntity = this.deps.turnManager.getCurrentEntity();
        this.deps.battleMap.draw(
            this.deps.renderer.ctx,
            this.deps.renderer,
            currentEntity,
            selectedEnemy,
        );
        const activeEnemies = enemies.filter((enemy) => enemy.active);
        const activeAllies = allies.filter((ally) => ally.active);
        this.deps.renderer.drawEntities([this.deps.player, ...activeAllies, ...activeEnemies]);
    }
}
