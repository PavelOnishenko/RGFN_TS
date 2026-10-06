export const npcTasksBalance = {
    sleepStartMinute: 22 * 60,
    wakeMinute: 6 * 60,
    travelSpeedCellsPerHour: 2,
    hunter: { rangeCells: 3, workStartMinute: 7 * 60, expeditionEndMinute: 18 * 60, workDurationMinMinutes: 30, workDurationMaxMinutes: 120 },
    herbalist: {
        rangeCells: 6,
        fieldDayChance: 0.5,
        workStartMinute: 7 * 60,
        expeditionEndMinute: 17 * 60,
        villageWorkEndMinute: 18 * 60,
        workDurationMinMinutes: 30,
        workDurationMaxMinutes: 120,
    },
    trader: { workStartMinute: 9 * 60, workEndMinute: 17 * 60 },
    miller: { workStartMinute: 8 * 60, workEndMinute: 18 * 60 },
    carpenter: { workStartMinute: 8 * 60, workEndMinute: 18 * 60 },
    innkeeper: { workStartMinute: 9 * 60, workEndMinute: 20 * 60 },
} as const;
