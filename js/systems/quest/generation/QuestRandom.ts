export interface QuestRandom {
    nextInt(min: number, max: number): number;
    nextBool(chance: number): boolean;
    pick<T>(items: T[]): T;
}

export class DefaultQuestRandom implements QuestRandom {
    public nextInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

    public nextBool = (chance: number): boolean => Math.random() < chance;

    public pick = <T>(items: T[]): T => items[this.nextInt(0, items.length - 1)];
}
