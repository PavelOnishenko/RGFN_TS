import VillageVillagerFactory from './VillageVillagerFactory.js';
import VillageVillagerMotion from './VillageVillagerMotion.js';

export type VillageActivityType = 'chatting' | 'drinking' | 'farming' | 'building' | 'carryingWater' | 'carryingLogs';

export type VillageSpot = {
    x: number;
    y: number;
    houseIndex?: number;
};

export type VillageVillager = {
    x: number;
    y: number;
    fromSpot: number;
    toSpot: number;
    travelStart: number;
    travelDuration: number;
    pauseUntil: number;
    skinColor: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
    hatColor: string;
    size: number;
    activity: VillageActivityType;
    propSwingOffset: number;
    armSwingOffset: number;
    isWalking: boolean;
};

export default class VillagePopulation {
    private spots: VillageSpot[] = [];
    private villagers: VillageVillager[] = [];
    private villageSnapshots: Map<string, VillageVillager[]> = new Map();
    private activeVillageId = '';
    private villagerFactory = new VillageVillagerFactory();
    private villagerMotion = new VillageVillagerMotion();

    public initialize(spots: VillageSpot[], now: number, villageId: string): void {
        this.spots = spots;
        this.activeVillageId = villageId;
        const snapshot = this.villageSnapshots.get(villageId);
        if (snapshot) {
            this.villagers = snapshot.map((villager) => this.villagerMotion.alignVillagerToSpots(villager, this.spots, now));
            return;
        }

        const villagerCount = 4 + Math.floor(Math.random() * 3);
        this.villagers = Array.from({ length: villagerCount }, () => this.villagerFactory.createVillager(this.spots, now));
        this.persistActiveVillageSnapshot();
    }

    public update(now: number, onSpotVisited: (spotIndex: number, now: number) => void): void {
        this.villagers.forEach((villager) => {
            this.villagerMotion.updateVillager(
                villager,
                this.spots,
                now,
                (spotIndex: number) => this.villagerFactory.pickDifferentSpot(spotIndex, this.spots.length),
                this.villagerFactory.pickActivity,
                onSpotVisited,
            );
        });

        this.villagers.sort((a, b) => a.y - b.y);
        this.persistActiveVillageSnapshot();
    }

    public getVillagers = (): VillageVillager[] => this.villagers;

    private persistActiveVillageSnapshot(): void {
        if (!this.activeVillageId) {
            return;
        }

        this.villageSnapshots.set(this.activeVillageId, this.villagers.map((villager) => ({ ...villager })));
    }
}
