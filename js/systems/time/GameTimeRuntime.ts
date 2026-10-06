export type TimeActivity = 'travel' | 'combat' | 'village' | 'rest' | 'idle';

type CalendarMonth = { name: string; days: number };

type CalendarState = {
    startYear: number;
    months: CalendarMonth[];
    totalMinutes: number;
};

export type CalendarSnapshot = {
    startYear: number;
    currentYear: number;
    currentMonthIndex: number;
    currentMonthName: string;
    currentDay: number;
    daysPerYear: number;
    months: CalendarMonth[];
};

const MINUTES_PER_DAY = 24 * 60;
const CALENDAR_COUNT_MIN = 1;
const CALENDAR_COUNT_MAX = 30;

export default class GameTimeRuntime {
    private readonly state: CalendarState;
    private rngState: number;

    public constructor(savedState?: Record<string, unknown> | null, generationSeed: number = Date.now()) {
        this.rngState = this.normalizeSeed(generationSeed);
        this.state = this.tryRestore(savedState) ?? this.createRandomCalendarState();
    }

    public advanceMinutes(minutes: number): void {
        if (!Number.isFinite(minutes) || minutes <= 0) {
            return;
        }
        this.state.totalMinutes += Math.max(1, Math.round(minutes));
    }

    public getDaylightFactor(): number {
        const hour = this.getHourOfDay();
        if (hour < 5 || hour >= 22) {return 0.46;}
        if (hour < 7) {return 0.95;}
        if (hour < 18) {return 1.12;}
        if (hour < 20) {return 1.04;}
        return 0.95;
    }

    public getHudClockText(): string {
        const hour = this.getHourOfDay().toString().padStart(2, '0');
        const minute = this.getMinuteOfHour().toString().padStart(2, '0');
        return `${hour}:${minute}`;
    }

    public getHudDateText(): string {
        const date = this.getCalendarDate();
        const month = this.state.months[date.monthIndex];
        return `Y${date.year} • ${month.name} ${date.day}`;
    }

    public getState(): Record<string, unknown> {
        return {
            startYear: this.state.startYear,
            months: this.state.months.map((month) => ({ ...month })),
            totalMinutes: this.state.totalMinutes,
        };
    }

    public getTotalMinutes = (): number => this.state.totalMinutes;

    public getCalendarSnapshot(): CalendarSnapshot {
        const date = this.getCalendarDate();
        return {
            startYear: this.state.startYear,
            currentYear: date.year,
            currentMonthIndex: date.monthIndex,
            currentMonthName: this.state.months[date.monthIndex]?.name ?? 'Unknown',
            currentDay: date.day,
            daysPerYear: this.state.months.reduce((sum, month) => sum + month.days, 0),
            months: this.state.months.map((month) => ({ ...month })),
        };
    }

    private getCalendarDate(): { year: number; monthIndex: number; day: number } {
        const daysPerYear = this.state.months.reduce((sum, month) => sum + month.days, 0);
        const elapsedDays = Math.floor(this.state.totalMinutes / MINUTES_PER_DAY);
        const yearOffset = daysPerYear > 0 ? Math.floor(elapsedDays / daysPerYear) : 0;
        let dayInYear = daysPerYear > 0 ? elapsedDays % daysPerYear : 0;

        for (let monthIndex = 0; monthIndex < this.state.months.length; monthIndex += 1) {
            const monthDays = this.state.months[monthIndex].days;
            if (dayInYear < monthDays) {
                return { year: this.state.startYear + yearOffset, monthIndex, day: dayInYear + 1 };
            }
            dayInYear -= monthDays;
        }

        return { year: this.state.startYear + yearOffset, monthIndex: 0, day: 1 };
    }

    private getMinuteOfDay(): number {
        const normalized = this.state.totalMinutes % MINUTES_PER_DAY;
        return normalized < 0 ? normalized + MINUTES_PER_DAY : normalized;
    }

    private getHourOfDay(): number {
        return Math.floor(this.getMinuteOfDay() / 60);
    }

    private getMinuteOfHour(): number {
        return this.getMinuteOfDay() % 60;
    }

    private createRandomCalendarState(): CalendarState {
        const startYear = this.sampleLogRange(0, 10000);
        const monthCount = this.sampleGroupedLogRange(CALENDAR_COUNT_MIN, CALENDAR_COUNT_MAX);
        const styleRoll = this.nextRandom();
        const baseDays = this.sampleGroupedLogRange(CALENDAR_COUNT_MIN, CALENDAR_COUNT_MAX);
        const months: CalendarMonth[] = [];

        for (let index = 0; index < monthCount; index += 1) {
            let days = baseDays;
            if (styleRoll < 0.33) {
                days = baseDays;
            } else if (styleRoll < 0.66) {
                days = Math.max(CALENDAR_COUNT_MIN, Math.min(CALENDAR_COUNT_MAX, baseDays + this.sampleInt(-2, 2)));
            } else {
                days = this.sampleGroupedLogRange(CALENDAR_COUNT_MIN, CALENDAR_COUNT_MAX);
            }
            months.push({ name: this.generateMonthName(index), days });
        }

        return { startYear, months, totalMinutes: this.sampleInt(0, MINUTES_PER_DAY - 1) };
    }

    private tryRestore(savedState?: Record<string, unknown> | null): CalendarState | null {
        if (!savedState) {return null;}
        const startYear = typeof savedState.startYear === 'number' ? Math.max(0, Math.floor(savedState.startYear)) : NaN;
        const totalMinutes = typeof savedState.totalMinutes === 'number' ? Math.max(0, Math.floor(savedState.totalMinutes)) : NaN;
        const rawMonths = Array.isArray(savedState.months) ? savedState.months : [];
        const months = rawMonths
            .filter((month): month is { name: string; days: number } => Boolean(month) && typeof (month as { name?: unknown }).name === 'string' && typeof (month as { days?: unknown }).days === 'number')
            .map((month) => ({
                name: month.name.trim() || 'Unnamed',
                days: Math.max(1, Math.floor(month.days)),
            }));

        if (!Number.isFinite(startYear) || !Number.isFinite(totalMinutes) || months.length === 0) {return null;}

        return { startYear, months, totalMinutes };
    }

    private sampleInt(min: number, max: number): number {
        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        return lower + Math.floor(this.nextRandom() * (upper - lower + 1));
    }

    private generateMonthName(index: number): string {
        const starts = ['A', 'Be', 'Cor', 'Dra', 'E', 'Fen', 'Gal', 'Hel', 'I', 'Jar', 'Kel', 'Lor', 'Mor', 'Nor', 'Or', 'Pra', 'Quel', 'Riv', 'Syl', 'Tor', 'Ul', 'Vor', 'Wyn', 'Xan', 'Yor', 'Zel'];
        const middles = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ou', 'ei', 'ar', 'el', 'or', 'un', 'ir'];
        const ends = ['n', 'l', 'r', 's', 'th', 'm', 'x', 'nd', 'ria', 'dor', 'len', 'via', 'tis', 'mar', 'dell', 'ron'];
        const start = starts[this.sampleInt(0, starts.length - 1)];
        const middle = middles[this.sampleInt(0, middles.length - 1)];
        const end = ends[this.sampleInt(0, ends.length - 1)];
        const maybeSecondMiddle = this.nextRandom() < 0.3 ? middles[this.sampleInt(0, middles.length - 1)] : '';
        const raw = `${start}${middle}${maybeSecondMiddle}${end}`;
        const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        return index === 0 ? normalized : `${normalized}`;
    }

    private sampleLogRange(min: number, max: number): number {
        if (min >= max) {return min;}
        const normalized = Math.log10(1 + this.nextRandom() * 9);
        return Math.max(min, Math.min(max, Math.round(min + ((max - min) * normalized))));
    }

    private sampleGroupedLogRange(min: number, max: number): number {
        if (min >= max) {return min;}

        const buckets: Array<{ from: number; to: number }> = [];
        let bucketStart = min;

        while (bucketStart <= max) {
            const bucketEnd = Math.min(max, (bucketStart * 2) - 1);
            buckets.push({ from: bucketStart, to: bucketEnd });
            bucketStart *= 2;
        }

        const bucketIndex = this.sampleInt(0, buckets.length - 1);
        const bucket = buckets[bucketIndex];
        return this.sampleInt(bucket.from, bucket.to);
    }

    private nextRandom(): number {
        this.rngState = (1664525 * this.rngState + 1013904223) >>> 0;
        return this.rngState / 0x100000000;
    }

    private normalizeSeed(seed: number): number {
        if (!Number.isFinite(seed)) {
            return 0x9e3779b9;
        }
        const normalized = Math.floor(Math.abs(seed)) >>> 0;
        return normalized === 0 ? 0x9e3779b9 : normalized;
    }
}
