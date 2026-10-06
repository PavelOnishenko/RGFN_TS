import type { VillageActivityType, VillageSpot, VillageVillager } from './VillagePopulation.js';

type PickDifferentSpot = (spotIndex: number) => number;
type PickActivity = () => VillageActivityType;

export default class VillageVillagerMotion {
    public updateVillager(
        villager: VillageVillager,
        spots: VillageSpot[],
        now: number,
        pickDifferentSpot: PickDifferentSpot,
        pickActivity: PickActivity,
        onSpotVisited: (spotIndex: number, now: number) => void,
    ): void {
        if (now < villager.pauseUntil) {
            villager.isWalking = false;
            return;
        }

        if (villager.fromSpot === villager.toSpot) {
            if (this.shouldPauseAtSpot()) {
                villager.pauseUntil = now + 5 + Math.random() * 10;
                villager.isWalking = false;
                return;
            }

            this.startTravel(villager, now, pickDifferentSpot, onSpotVisited);
        }

        this.advanceTravel(villager, spots, now, pickActivity, onSpotVisited);
    }

    public alignVillagerToSpots(villager: VillageVillager, spots: VillageSpot[], now: number): VillageVillager {
        const safeFromSpot = this.clampSpotIndex(villager.fromSpot, spots.length);
        const safeToSpot = this.clampSpotIndex(villager.toSpot, spots.length);
        const from = spots[safeFromSpot];
        const to = spots[safeToSpot];
        if (!from || !to) {
            return { ...villager, x: 0, y: 0, fromSpot: 0, toSpot: 0 };
        }

        const aligned = { ...villager, fromSpot: safeFromSpot, toSpot: safeToSpot };
        if (now < aligned.pauseUntil || aligned.fromSpot === aligned.toSpot) {
            return { ...aligned, x: from.x, y: from.y };
        }

        return this.alignAlongPath(aligned, from, to, now);
    }

    private shouldPauseAtSpot = (): boolean => Math.random() < 0.62;

    private startTravel(villager: VillageVillager, now: number, pickDifferentSpot: PickDifferentSpot, onSpotVisited: (spotIndex: number, now: number) => void): void {
        villager.toSpot = pickDifferentSpot(villager.fromSpot);
        villager.travelStart = now;
        villager.travelDuration = 5 + Math.random() * 4;
        villager.isWalking = true;
        onSpotVisited(villager.fromSpot, now);
        onSpotVisited(villager.toSpot, now);
    }

    private advanceTravel(
        villager: VillageVillager,
        spots: VillageSpot[],
        now: number,
        pickActivity: PickActivity,
        onSpotVisited: (spotIndex: number, now: number) => void,
    ): void {
        const from = spots[villager.fromSpot];
        const to = spots[villager.toSpot];
        const travelProgress = (now - villager.travelStart) / villager.travelDuration;

        if (travelProgress >= 1) {
            this.finishTravel(villager, now, pickActivity, onSpotVisited);
            return;
        }

        villager.isWalking = true;
        const smoothProgress = this.smoothStep(travelProgress);
        villager.x = from.x + (to.x - from.x) * smoothProgress;
        villager.y = from.y + (to.y - from.y) * smoothProgress;
    }

    private finishTravel(villager: VillageVillager, now: number, pickActivity: PickActivity, onSpotVisited: (spotIndex: number, now: number) => void): void {
        villager.fromSpot = villager.toSpot;
        villager.toSpot = villager.fromSpot;
        villager.travelStart = now;
        villager.travelDuration = 5 + Math.random() * 4;
        villager.pauseUntil = now + 6 + Math.random() * 14;
        villager.isWalking = false;
        villager.activity = pickActivity();
        onSpotVisited(villager.fromSpot, now);
    }

    private alignAlongPath(villager: VillageVillager, from: VillageSpot, to: VillageSpot, now: number): VillageVillager {
        const travelProgress = Math.max(0, Math.min(1, (now - villager.travelStart) / Math.max(0.01, villager.travelDuration)));
        const smoothProgress = this.smoothStep(travelProgress);
        return { ...villager, x: from.x + (to.x - from.x) * smoothProgress, y: from.y + (to.y - from.y) * smoothProgress };
    }

    private clampSpotIndex(spotIndex: number, spotsLength: number): number {
        if (spotsLength === 0) {
            return 0;
        }

        if (spotIndex < 0 || spotIndex >= spotsLength) {
            return 0;
        }

        return spotIndex;
    }

    private smoothStep = (value: number): number => value * value * (3 - 2 * value);
}
