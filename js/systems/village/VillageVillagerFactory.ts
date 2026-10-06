import { theme } from '../../config/ThemeConfig.js';
import type { VillageActivityType, VillageSpot, VillageVillager } from './VillagePopulation.js';

export default class VillageVillagerFactory {
    private static readonly ACTIVITIES: VillageActivityType[] = ['chatting', 'drinking', 'farming', 'building', 'carryingWater', 'carryingLogs'];

    public createVillager(spots: VillageSpot[], now: number): VillageVillager {
        const fromSpot = Math.floor(Math.random() * spots.length);
        const toSpot = this.pickDifferentSpot(fromSpot, spots.length);
        const startSpot = spots[fromSpot];

        return {
            x: startSpot.x,
            y: startSpot.y,
            fromSpot,
            toSpot,
            travelStart: now - Math.random() * 1.5,
            travelDuration: 4.8 + Math.random() * 3.6,
            pauseUntil: now + 4 + Math.random() * 8,
            skinColor: this.pickFrom(this.getSkinPalette()),
            hairColor: this.pickFrom(this.getHairPalette()),
            shirtColor: this.pickFrom(this.getShirtPalette()),
            pantsColor: this.pickFrom(this.getPantsPalette()),
            hatColor: this.pickFrom(this.getHatPalette()),
            size: 0.62 + Math.random() * 0.18,
            activity: this.pickActivity(),
            propSwingOffset: Math.random() * Math.PI * 2,
            armSwingOffset: Math.random() * Math.PI * 2,
            isWalking: true,
        };
    }

    public pickActivity = (): VillageActivityType => this.pickFrom(VillageVillagerFactory.ACTIVITIES);

    public pickDifferentSpot(spotIndex: number, spotsLength: number): number {
        let nextSpot = Math.floor(Math.random() * spotsLength);
        if (nextSpot === spotIndex) {
            nextSpot = (nextSpot + 1) % spotsLength;
        }

        return nextSpot;
    }

    private getSkinPalette = (): string[] => [theme.ui.panelHighlight, theme.ui.primaryAccent, theme.ui.secondaryAccent, theme.worldMap.terrain.desert];

    private getHairPalette = (): string[] => [
        theme.worldMap.terrain.forest,
        theme.worldMap.terrain.mountain,
        theme.ui.primaryBg,
        theme.ui.secondaryBg,
        theme.ui.secondaryAccent,
    ];

    private getShirtPalette = (): string[] => [
        theme.entities.player.body,
        theme.worldMap.terrain.water,
        theme.worldMap.terrain.grass,
        theme.ui.secondaryAccent,
        theme.ui.primaryAccent,
    ];

    private getPantsPalette = (): string[] => [theme.ui.primaryBg, theme.ui.secondaryBg, theme.worldMap.terrain.mountain, theme.worldMap.terrain.forest];

    private getHatPalette = (): string[] => [
        theme.ui.secondaryAccent,
        theme.worldMap.terrain.water,
        theme.worldMap.terrain.forest,
        theme.worldMap.terrain.desert,
        theme.ui.primaryAccent,
    ];

    private pickFrom = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
}
