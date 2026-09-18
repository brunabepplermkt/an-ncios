export type PeriodKey = "today" | "yesterday" | "7d" | "14d" | "30d" | "this_month" | "last_month" | "custom";

export interface Period {
  start: Date;
  end: Date; // inclusive, end of day (in the business timezone)
  days: number;
}

const DEFAULT_TZ = "America/Sao_Paulo";

/** Offset (ms) such that `wallClockMs = instantMs + offset` for `timeZone` at `instant`. */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - instant.getTime();
}

/** The UTC instant that is local midnight of `year-month-day` in `timeZone`. */
function zonedStartOfDayUTC(year: number, month: number, day: number, timeZone: string): Date {
  const noonGuess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offset = getTimeZoneOffsetMs(noonGuess, timeZone);
  const targetWallMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  let instant = targetWallMs - offset;
  // Refine once against the offset actually in effect at the computed instant (handles DST edges).
  const offset2 = getTimeZoneOffsetMs(new Date(instant), timeZone);
  instant = targetWallMs - offset2;
  return new Date(instant);
}

function zonedEndOfDayUTC(year: number, month: number, day: number, timeZone: string): Date {
  const nextDayStart = zonedStartOfDayUTC(year, month, day + 1, timeZone);
  return new Date(nextDayStart.getTime() - 1);
}

function zonedYMD(instant: Date, timeZone: string): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function addDays(ymd: { year: number; month: number; day: number }, delta: number) {
  // Date.UTC normalizes out-of-range day values, so this correctly rolls over months/years.
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Start-of-"today" instant in `timeZone`, exported so demo data generation can align with the same day boundaries the UI filters use. */
export function todayStartInZone(timeZone: string = DEFAULT_TZ): Date {
  const ymd = zonedYMD(new Date(), timeZone);
  return zonedStartOfDayUTC(ymd.year, ymd.month, ymd.day, timeZone);
}

export function resolvePeriod(key: PeriodKey, timeZone: string = DEFAULT_TZ, customStart?: string, customEnd?: string): Period {
  const nowYmd = zonedYMD(new Date(), timeZone);

  if (key === "today") {
    const start = zonedStartOfDayUTC(nowYmd.year, nowYmd.month, nowYmd.day, timeZone);
    const end = zonedEndOfDayUTC(nowYmd.year, nowYmd.month, nowYmd.day, timeZone);
    return { start, end, days: 1 };
  }

  if (key === "yesterday") {
    const y = addDays(nowYmd, -1);
    const start = zonedStartOfDayUTC(y.year, y.month, y.day, timeZone);
    const end = zonedEndOfDayUTC(y.year, y.month, y.day, timeZone);
    return { start, end, days: 1 };
  }

  if (key === "custom" && customStart && customEnd) {
    const [sy, sm, sd] = customStart.split("-").map(Number);
    const [ey, em, ed] = customEnd.split("-").map(Number);
    const start = zonedStartOfDayUTC(sy, sm, sd, timeZone);
    const end = zonedEndOfDayUTC(ey, em, ed, timeZone);
    const days = Math.max(1, daysBetween(start, zonedStartOfDayUTC(ey, em, ed, timeZone)) + 1);
    return { start, end, days };
  }

  if (key === "this_month") {
    const start = zonedStartOfDayUTC(nowYmd.year, nowYmd.month, 1, timeZone);
    const end = zonedEndOfDayUTC(nowYmd.year, nowYmd.month, nowYmd.day, timeZone);
    const days = daysBetween(start, zonedStartOfDayUTC(nowYmd.year, nowYmd.month, nowYmd.day, timeZone)) + 1;
    return { start, end, days };
  }

  if (key === "last_month") {
    const firstOfThisMonth = addDays({ year: nowYmd.year, month: nowYmd.month, day: 1 }, 0);
    const lastOfPrevMonth = addDays(firstOfThisMonth, -1);
    const start = zonedStartOfDayUTC(lastOfPrevMonth.year, lastOfPrevMonth.month, 1, timeZone);
    const end = zonedEndOfDayUTC(lastOfPrevMonth.year, lastOfPrevMonth.month, lastOfPrevMonth.day, timeZone);
    const days = daysBetween(start, zonedStartOfDayUTC(lastOfPrevMonth.year, lastOfPrevMonth.month, lastOfPrevMonth.day, timeZone)) + 1;
    return { start, end, days };
  }

  const days = key === "7d" ? 7 : key === "14d" ? 14 : 30;
  const startYmd = addDays(nowYmd, -(days - 1));
  const start = zonedStartOfDayUTC(startYmd.year, startYmd.month, startYmd.day, timeZone);
  const end = zonedEndOfDayUTC(nowYmd.year, nowYmd.month, nowYmd.day, timeZone);
  return { start, end, days };
}

/** The period immediately preceding `period`, same length — used for "what changed" comparisons. */
export function previousPeriod(period: Period): Period {
  const end = new Date(period.start.getTime() - 1);
  const start = new Date(period.start.getTime() - period.days * 86_400_000);
  return { start, end, days: period.days };
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "7 dias",
  "14d": "14 dias",
  "30d": "30 dias",
  this_month: "Este mês",
  last_month: "Mês passado",
  custom: "Período personalizado",
};
