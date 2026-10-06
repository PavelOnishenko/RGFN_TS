import { WALK_KEYFRAMES, WALK_META } from '../../../animations/imported/walkImported.js';
import StickFigure from '../../../utils/StickFigure.js';
import { generateVillageName } from '../../world/VillageNameGenerator.js';
import VillageHouseRenderer from '../VillageHouseRenderer.js';
import VillageLifeLayoutBuilder from './VillageLifeLayoutBuilder.js';
import { IsoPoint, VillageHouse } from './VillageLifeTypes.js';
import VillagePopulation, { VillageSpot, VillageVillager } from '../VillagePopulation.js';

export default class VillageLifeRenderer {
    private static readonly ISO_COS = Math.cos(Math.PI / 6);
    private static readonly ISO_SIN = Math.sin(Math.PI / 6);

    private readonly villagePopulation: VillagePopulation;
    private readonly layoutBuilder: VillageLifeLayoutBuilder;
    private readonly houseRenderer: VillageHouseRenderer;
    private villageHouses: VillageHouse[] = [];
    private villageSpots: VillageSpot[] = [];
    private currentVillageName = '';
    private isoOriginX = 0;
    private isoOriginY = 0;
    private isoScale = 1;

    constructor(villagePopulation: VillagePopulation) {
        this.villagePopulation = villagePopulation;
        this.layoutBuilder = new VillageLifeLayoutBuilder(this.mixColors);
        this.houseRenderer = new VillageHouseRenderer(this.mixColors, this.projectIso);
    }

    public initialize(width: number, height: number, villageName?: string): void {
        this.currentVillageName = villageName ?? this.generateVillageName();
        this.isoScale = Math.max(18, width * 0.024);
        this.isoOriginX = width * 0.5;
        this.isoOriginY = height * 0.34;
        this.villageHouses = this.layoutBuilder.buildHouses();
        this.villageSpots = this.layoutBuilder.buildVillageSpots(this.villageHouses, this.projectIso);
        this.villagePopulation.initialize(this.villageSpots, performance.now() * 0.001, this.currentVillageName);
    }

    public update(now: number): void {
        this.updateHouseDoors(now);
        this.villagePopulation.update(now, (spotIndex, time) => this.triggerHouseDoorBySpot(spotIndex, time));
    }

    public render(ctx: CanvasRenderingContext2D, time: number): void {
        this.villageHouses.forEach((house) => this.houseRenderer.drawVillageHouse(ctx, house));
        this.villagePopulation.getVillagers().forEach((villager) => this.drawVillageVillager(ctx, villager, time));
    }

    public getVillageName = (): string => this.currentVillageName;

    private updateHouseDoors(now: number): void {
        this.villageHouses.forEach((house) => {
            const open = now < house.doorStateUntil;
            house.doorTargetOpenAmount = open ? 1 : 0;
            house.doorOpenAmount += (house.doorTargetOpenAmount - house.doorOpenAmount) * (open ? 0.18 : 0.1);
            house.doorOpenAmount = Math.max(0, Math.min(1, house.doorOpenAmount));
        });
    }

    private triggerHouseDoorBySpot(spotIndex: number, now: number): void {
        const spot = this.villageSpots[spotIndex];
        const house = spot && typeof spot.houseIndex === 'number' ? this.villageHouses[spot.houseIndex] : null;
        if (!house) {
            return;
        }

        house.doorStateUntil = Math.max(house.doorStateUntil, now + 2.2);
    }

    private drawVillageVillager(ctx: CanvasRenderingContext2D, villager: VillageVillager, time: number): void {
        const fromSpot = this.villageSpots[villager.fromSpot];
        const toSpot = this.villageSpots[villager.toSpot];
        const movementX = (toSpot?.x ?? villager.x) - (fromSpot?.x ?? villager.x);
        const isFacingRight = movementX >= 0;
        const walkCycleTime = (time * 1.6) + villager.armSwingOffset;
        const walkDuration = Math.max(0.0001, WALK_META.duration);
        const wrappedTime = ((walkCycleTime % walkDuration) + walkDuration) % walkDuration;
        const animationProgress = villager.isWalking ? (wrappedTime / walkDuration) : 0;
        const pose = StickFigure.getPoseFromImportedAnimation(WALK_KEYFRAMES, WALK_META, animationProgress);

        ctx.save();
        const drawX = villager.x;
        const drawY = villager.y + (villager.size * 2.2);
        const bodyColor = this.mixColors(villager.shirtColor, villager.pantsColor, 0.45);
        const renderScale = villager.size * 0.75;
        StickFigure.draw(ctx, drawX, drawY, pose, bodyColor, isFacingRight, renderScale);
        ctx.restore();
    }

    private projectIso = (x: number, y: number, z: number): IsoPoint => ({
        x: this.isoOriginX + (x - y) * VillageLifeRenderer.ISO_COS * this.isoScale,
        y: this.isoOriginY + (x + y) * VillageLifeRenderer.ISO_SIN * this.isoScale - z * this.isoScale,
    });

    private generateVillageName = (): string => generateVillageName(Math.floor(Math.random() * 0x7fffffff));

    private mixColors(colorA: string, colorB: string, ratio: number): string {
        const blend = Math.max(0, Math.min(1, ratio));
        const rA = parseInt(colorA.slice(1, 3), 16);
        const gA = parseInt(colorA.slice(3, 5), 16);
        const bA = parseInt(colorA.slice(5, 7), 16);
        const rB = parseInt(colorB.slice(1, 3), 16);
        const gB = parseInt(colorB.slice(3, 5), 16);
        const bB = parseInt(colorB.slice(5, 7), 16);
        if ([rA, gA, bA, rB, gB, bB].some((value) => Number.isNaN(value))) {
            return colorA;
        }

        const r = Math.round(rA + (rB - rA) * blend);
        const g = Math.round(gA + (gB - gA) * blend);
        const b = Math.round(bA + (bB - bA) * blend);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
