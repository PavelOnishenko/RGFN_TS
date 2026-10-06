import { SelectedBattleCellInfo, SelectedCellInfo, SelectedWorldCellInfo } from '../../types/game.js';
import { HudElements } from './HudTypes.js';

export default class HudSelectionInfoController {
    private readonly hudElements: HudElements;

    constructor(hudElements: HudElements) {
        this.hudElements = hudElements;
    }

    public updateSelectedCellInfo(selectedCell: SelectedCellInfo | null): void {
        const hasSelectedCell = Boolean(selectedCell);
        this.hudElements.selectedCellEmpty.classList.toggle('hidden', hasSelectedCell);
        this.hudElements.selectedCellDetails.classList.toggle('hidden', !hasSelectedCell);

        if (!selectedCell) {
            return;
        }

        this.hudElements.selectedCellCoords.textContent = `${selectedCell.col}, ${selectedCell.row}`;

        if (selectedCell.mode === 'battle') {
            this.renderBattleCell(selectedCell);
            return;
        }

        this.renderWorldCell(selectedCell);
    }

    private renderBattleCell(selectedCell: SelectedBattleCellInfo): void {
        const occupantLabel = selectedCell.occupantType
            ? `${selectedCell.occupantType === 'player' ? 'Player' : 'Enemy'}`
            : 'None';
        const hpLabel = selectedCell.occupantHp !== null && selectedCell.occupantMaxHp !== null
            ? `${selectedCell.occupantHp}/${selectedCell.occupantMaxHp}`
            : '—';

        this.hudElements.selectedCellTerrain.textContent = selectedCell.obstacleName
            ? `${this.formatTerrainLabel(selectedCell.terrainType)} (${selectedCell.obstacleName})`
            : this.formatTerrainLabel(selectedCell.terrainType);
        this.hudElements.selectedCellVisibility.textContent = 'Battle map';
        this.hudElements.selectedCellTraversable.textContent = selectedCell.isTraversable ? 'Walkable' : 'Blocked';
        this.hudElements.selectedCellVillage.textContent = occupantLabel;
        this.hudElements.selectedCellVillageName.textContent = selectedCell.occupantName ?? '—';
        this.hudElements.selectedCellVillageStatus.textContent = `HP ${hpLabel}`;
    }

    private renderWorldCell(selectedCell: SelectedWorldCellInfo): void {
        const terrainIsKnown = selectedCell.isVisible || selectedCell.fogState !== 'unknown';
        const villageDetailsKnown = terrainIsKnown && selectedCell.isVillage;
        this.hudElements.selectedCellTerrain.textContent = terrainIsKnown ? this.formatTerrainLabel(selectedCell.terrainType) : 'Unknown';
        this.hudElements.selectedCellVisibility.textContent = this.formatVisibilityLabel(selectedCell);
        this.hudElements.selectedCellTraversable.textContent = terrainIsKnown ? (selectedCell.isTraversable ? 'Walkable' : 'Blocked') : 'Unknown';
        this.hudElements.selectedCellVillage.textContent = terrainIsKnown ? (selectedCell.isVillage ? 'Yes' : 'No') : 'Unknown';
        this.hudElements.selectedCellVillageName.textContent = terrainIsKnown ? (selectedCell.villageName ?? '—') : 'Unknown';
        this.hudElements.selectedCellVillageStatus.textContent = villageDetailsKnown ? this.formatVillageStatusLabel(selectedCell.villageStatus) : (terrainIsKnown ? '—' : 'Unknown');
    }

    private formatVillageStatusLabel(status: SelectedWorldCellInfo['villageStatus']): string {
        if (status === 'current') {
            return 'Current location';
        }

        if (status === 'mapped') {
            return 'Mapped village';
        }

        return '—';
    }

    private formatTerrainLabel(terrainType: SelectedWorldCellInfo['terrainType']): string {
        if (terrainType === 'mountain') {
            return 'Hills';
        }

        return terrainType.charAt(0).toUpperCase() + terrainType.slice(1);
    }

    private formatVisibilityLabel(selectedCell: SelectedWorldCellInfo): string {
        if (selectedCell.isVisible) {
            return 'Visible now';
        }

        if (selectedCell.fogState === 'hidden') {
            return 'Explored, not visible';
        }

        return 'Unexplored';
    }
}
