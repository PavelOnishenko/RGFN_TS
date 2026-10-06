import { CombatEntity, GridPosition, SelectedBattleCellInfo, TerrainType } from '../../../types/game.js';
import { BattleObstacle, BattleObstacleKind } from '../BattleMapView.js';

export default class BattleMapSelectionInfo {
    public static build(
        selectedGridPos: GridPosition | null,
        entities: CombatEntity[],
        obstacles: Map<string, BattleObstacle>,
        terrainType: TerrainType,
    ): SelectedBattleCellInfo | null {
        if (!selectedGridPos) {
            return null;
        }

        const obstacle = obstacles.get(BattleMapSelectionInfo.getCellKey(selectedGridPos.col, selectedGridPos.row));
        const occupant = entities.find(
            (entity) => entity.gridCol === selectedGridPos.col
                && entity.gridRow === selectedGridPos.row
                && !entity.isDead(),
        ) ?? null;

        return {
            mode: 'battle',
            col: selectedGridPos.col,
            row: selectedGridPos.row,
            terrainType,
            obstacleName: obstacle ? BattleMapSelectionInfo.formatObstacleName(obstacle.kind) : null,
            isTraversable: !obstacle && occupant === null,
            occupantType: occupant ? (occupant.constructor.name === 'Player' ? 'player' : 'enemy') : null,
            occupantName: BattleMapSelectionInfo.getOccupantDisplayName(occupant),
            occupantHp: occupant?.hp ?? null,
            occupantMaxHp: occupant?.maxHp ?? null,
        };
    }

    private static getOccupantDisplayName(occupant: CombatEntity | null): string | null {
        if (!occupant) {
            return null;
        }
        if (occupant.constructor.name === 'Player') {
            return 'Hero';
        }

        const maybeNamedOccupant = occupant as CombatEntity & { name?: unknown };
        if (typeof maybeNamedOccupant.name === 'string' && maybeNamedOccupant.name.trim().length > 0) {
            return maybeNamedOccupant.name;
        }

        return occupant.constructor?.name ?? null;
    }

    private static formatObstacleName = (kind: BattleObstacleKind): string => kind.charAt(0).toUpperCase() + kind.slice(1);

    private static getCellKey = (col: number, row: number): string => `${col},${row}`;
}
