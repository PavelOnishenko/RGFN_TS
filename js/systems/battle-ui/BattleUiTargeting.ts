import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import Player from '../../entities/player/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { Direction } from '../../types/game.js';
import { BattleUI, SelectionResult } from './BattleUiTypes.js';

export default class BattleUiTargeting {
    private battleUI: BattleUI;
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private player: Player;

    constructor(battleUI: BattleUI, battleMap: BattleMap, turnManager: TurnManager, player: Player) {
        this.battleUI = battleUI;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.player = player;
    }

    public updateEnemyDisplay(selectedEnemy: Skeleton | null): Skeleton | null {
        const nextEnemy = this.resolveEnemyForDisplay(selectedEnemy);
        if (!nextEnemy.displayEnemy) {
            this.setEmptyEnemyDisplay();
            return null;
        }

        this.setEnemyDisplay(nextEnemy.displayEnemy, nextEnemy.selectedEnemy);
        return nextEnemy.selectedEnemy;
    }

    public handleMovementOrSelection(direction: Direction, selectedEnemy: Skeleton | null): SelectionResult {
        const enemyInDirection = this.getEnemyInDirection(direction);
        if (enemyInDirection) {
            return { selectedEnemy: enemyInDirection, moved: false };
        }

        return { selectedEnemy, moved: this.battleMap.moveEntity(this.player, direction) };
    }

    public selectEnemyFromCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement): Skeleton | null {
        const clickPoint = this.getCanvasClickPoint(event, canvas);
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];

        for (const enemy of enemies) {
            if (Math.hypot(clickPoint.x - enemy.x, clickPoint.y - enemy.y) <= 20) {
                return enemy;
            }
        }

        return null;
    }

    public hasEnemyInDirectionalRange(): boolean {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.some((enemy) => this.battleMap.isInMeleeRange(this.player, enemy));
    }

    public hasEnemyInAttackRange(range: number): boolean {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.some((enemy) => this.battleMap.isInAttackRange(this.player, enemy, range));
    }

    private resolveEnemyForDisplay(selectedEnemy: Skeleton | null): { displayEnemy: Skeleton | null; selectedEnemy: Skeleton | null } {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        if (selectedEnemy && !selectedEnemy.isDead()) {
            return { displayEnemy: selectedEnemy, selectedEnemy };
        }

        const adjacentEnemy = this.getAdjacentEnemy();
        if (adjacentEnemy) {
            return { displayEnemy: adjacentEnemy, selectedEnemy: adjacentEnemy };
        }

        return { displayEnemy: enemies[0] ?? null, selectedEnemy: null };
    }

    private getAdjacentEnemy(): Skeleton | null {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.find((enemy) => this.battleMap.isInMeleeRange(this.player, enemy)) ?? null;
    }

    private setEnemyDisplay(displayEnemy: Skeleton, selectedEnemy: Skeleton | null): void {
        const selectedSuffix = displayEnemy === selectedEnemy ? ' [SELECTED]' : '';
        this.battleUI.enemyName.textContent = displayEnemy.name + selectedSuffix;
        this.battleUI.enemyHp.textContent = String(displayEnemy.hp);
        this.battleUI.enemyMaxHp.textContent = String(displayEnemy.maxHp);
    }

    private setEmptyEnemyDisplay(): void {
        this.battleUI.enemyName.textContent = '-';
        this.battleUI.enemyHp.textContent = '-';
        this.battleUI.enemyMaxHp.textContent = '-';
    }

    private getCanvasClickPoint(event: MouseEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    }

    private getEnemyInDirection(direction: Direction): Skeleton | null {
        const playerCol = this.player.gridCol ?? 0;
        const playerRow = this.player.gridRow ?? 0;
        const target = this.getDirectionalTarget(direction, playerCol, playerRow);
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];

        return enemies.find((enemy) => enemy.gridCol === target.col && enemy.gridRow === target.row) ?? null;
    }

    private getDirectionalTarget(direction: Direction, playerCol: number, playerRow: number): { col: number; row: number } {
        const directionalTargets = {
            up: { col: playerCol, row: playerRow - 1 },
            down: { col: playerCol, row: playerRow + 1 },
            left: { col: playerCol - 1, row: playerRow },
            right: { col: playerCol + 1, row: playerRow },
        };

        return directionalTargets[direction];
    }
}
