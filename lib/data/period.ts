export type PeriodKey = "7d" | "14d" | "30d" | "this_month" | "custom";

export interface Period {
  start: Date;
  end: Date; // inclusive, end of day
  days: number;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolvePeriod(key: PeriodKey, customStart?: string, customEnd?: string): Period {
  const today = new Date();

  if (key === "custom" && customStart && customEnd) {
    const start = startOfDay(new Date(customStart));
    const endDay = startOfDay(new Date(customEnd));
    const days = Math.max(1, Math.round((endDay.getTime() - start.getTime()) / 86_400_000) + 1);
    return { start, end: endOfDay(endDay), days };
  }

  if (key === "this_month") {
    const start = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const days = Math.round((startOfDay(today).getTime() - start.getTime()) / 86_400_000) + 1;
    return { start, end: endOfDay(today), days };
  }

  const days = key === "7d" ? 7 : key === "14d" ? 14 : 30;
  const end = endOfDay(today);
  const start = startOfDay(new Date(today.getTime() - (days - 1) * 86_400_000));
  return { start, end, days };
}

/** The period immediately preceding `period`, same length — used for "what changed" comparisons. */
export function previousPeriod(period: Period): Period {
  const end = new Date(period.start.getTime() - 1);
  const start = startOfDay(new Date(end.getTime() - (period.days - 1) * 86_400_000));
  return { start, end: endOfDay(end), days: period.days };
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d": "7 dias",
  "14d": "14 dias",
  "30d": "30 dias",
  this_month: "Este mês",
  custom: "Período personalizado",
};
