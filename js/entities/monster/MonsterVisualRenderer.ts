import { theme } from '../../config/ThemeConfig.js';

type MonsterDrawFn = (ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number) => void;

export class MonsterVisualRenderer {
    private readonly drawByName: Record<string, MonsterDrawFn>;

    constructor() {
        this.drawByName = {
            Zombie: (ctx, left, top, width, height) => this.drawZombie(ctx, left, top, width, height),
            Ninja: (ctx, left, top, width, height) => this.drawNinja(ctx, left, top, width, height),
            'Dark Knight': (ctx, left, top, width, height) => this.drawDarkKnight(ctx, left, top, width, height),
            Dragon: (ctx, left, top, width, height) => this.drawDragon(ctx, left, top, width, height),
        };
    }

    public drawEntity(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, width: number, height: number): void {
        const left = x - width / 2;
        const top = y - height / 2;
        const drawFn = this.drawByName[name] ?? ((innerCtx, innerLeft, innerTop, innerWidth, innerHeight) => {
            this.drawSkeleton(innerCtx, innerLeft, innerTop, innerWidth, innerHeight);
        });
        drawFn(ctx, left, top, width, height);
    }

    public drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, width: number, height: number, hp: number, maxHp: number): void {
        const barHeight = 3;
        const barY = screenY - height / 2 - 6;
        ctx.fillStyle = theme.entities.skeleton.healthBg;
        ctx.fillRect(screenX - width / 2, barY, width, barHeight);
        const healthBarWidth = width * (hp / maxHp);
        ctx.fillStyle = theme.entities.skeleton.healthBar;
        ctx.fillRect(screenX - width / 2, barY, healthBarWidth, barHeight);
    }

    private drawSkeleton(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
        ctx.fillStyle = theme.entities.skeleton.body;
        ctx.beginPath();
        ctx.ellipse(left + width / 2, top + height / 2, width * 0.34, height * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.entities.skeleton.features;
        ctx.fillRect(left + 8, top + 7, 4, 4);
        ctx.fillRect(left + width - 12, top + 7, 4, 4);
        ctx.fillRect(left + width / 2 - 2, top + 13, 4, 3);
    }

    private drawZombie(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
        ctx.fillStyle = theme.worldMap.terrain.forest;
        ctx.fillRect(left + 5, top + 4, width - 10, height - 7);
        ctx.fillStyle = theme.entities.player.face;
        ctx.fillRect(left + 8, top + 7, width - 16, 9);
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.fillRect(left + 10, top + 10, 3, 2);
        ctx.fillRect(left + width - 13, top + 10, 3, 2);
    }

    private drawNinja(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.fillRect(left + 5, top + 5, width - 10, height - 8);
        ctx.fillStyle = theme.entities.player.face;
        ctx.fillRect(left + 8, top + 10, width - 16, 5);
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.fillRect(left + 9, top + 11, 2, 2);
        ctx.fillRect(left + width - 11, top + 11, 2, 2);
    }

    private drawDarkKnight(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
        ctx.fillStyle = theme.ui.textMuted;
        ctx.fillRect(left + 4, top + 4, width - 8, height - 4);
        ctx.fillStyle = theme.ui.secondaryAccent;
        ctx.fillRect(left + width / 2 - 1, top + 6, 2, height - 8);
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.fillRect(left + width / 2 - 3, top + 9, 6, 4);
    }

    private drawDragon(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.beginPath();
        ctx.moveTo(left + 4, top + height - 6);
        ctx.lineTo(left + width / 2, top + 4);
        ctx.lineTo(left + width - 4, top + height - 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.ui.warningColor;
        ctx.fillRect(left + width / 2 - 2, top + 10, 4, 4);
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.fillRect(left + width / 2 - 5, top + height - 9, 10, 3);
    }
}
