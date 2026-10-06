import { theme } from '../../../config/ThemeConfig.js';

type PlayerRenderState = {
    x: number;
    y: number;
    width: number;
    height: number;
    hp: number;
    maxHp: number;
};

export default class PlayerRenderer {
    public draw(ctx: CanvasRenderingContext2D, player: PlayerRenderState): void {
        const screenX = player.x;
        const screenY = player.y;
        const left = screenX - player.width / 2;
        const top = screenY - player.height / 2;

        this.drawShadow(ctx, screenX, screenY, player.width, player.height);
        this.drawBody(ctx, screenX, top, left, player.width, player.height);
        this.drawHead(ctx, screenX, top, player.width, player.height);
        this.drawShoulders(ctx, left, top, player.width);
        this.drawHealthBar(ctx, player, screenX, screenY);
    }

    private drawShadow(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + (height * 0.33), width * 0.42, height * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawBody(ctx: CanvasRenderingContext2D, screenX: number, top: number, left: number, width: number, height: number): void {
        ctx.fillStyle = theme.entities.player.body;
        ctx.beginPath();
        ctx.moveTo(screenX, top + 2);
        ctx.lineTo(left + 4, top + height - 2);
        ctx.lineTo(left + width - 4, top + height - 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = theme.entities.player.face;
        ctx.fillRect(screenX - 4, top + 10, 8, 10);
    }

    private drawHead(ctx: CanvasRenderingContext2D, screenX: number, top: number, width: number, height: number): void {
        const radius = Math.max(5, Math.min(8, width * 0.3));
        const headY = top + Math.max(7, height * 0.34);
        ctx.fillStyle = theme.entities.player.face;
        ctx.beginPath();
        ctx.arc(screenX, headY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.beginPath();
        ctx.arc(screenX, headY, radius + 1, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.fillRect(screenX - 3, headY - 1, 2, 2);
        ctx.fillRect(screenX + 1, headY - 1, 2, 2);
        ctx.fillRect(screenX - 2, headY + 3, 4, 1);
    }

    private drawShoulders(ctx: CanvasRenderingContext2D, left: number, top: number, width: number): void {
        ctx.fillStyle = theme.ui.secondaryAccent;
        ctx.fillRect(left + 2, top + 12, 5, 4);
        ctx.fillRect(left + width - 7, top + 12, 5, 4);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, player: PlayerRenderState, screenX: number, screenY: number): void {
        const barHeight = 4;
        const barY = screenY - player.height / 2 - 8;

        ctx.fillStyle = theme.entities.player.healthBg;
        ctx.fillRect(screenX - player.width / 2, barY, player.width, barHeight);

        const healthPercent = player.hp / player.maxHp;
        const healthBarWidth = player.width * healthPercent;
        ctx.fillStyle = this.getHealthColor(healthPercent);
        ctx.fillRect(screenX - player.width / 2, barY, healthBarWidth, barHeight);
    }

    private getHealthColor(healthPercent: number): string {
        if (healthPercent > 0.6) {
            return theme.entities.player.healthHigh;
        }

        if (healthPercent > 0.3) {
            return theme.entities.player.healthMid;
        }

        return theme.entities.player.healthLow;
    }
}
