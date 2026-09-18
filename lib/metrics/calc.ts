import type { NormalizedMetrics, RawMetrics } from "./types";

/** Divides a/b, returning undefined instead of NaN/Infinity when b is missing or zero. */
function safeDiv(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined || b === undefined || b === 0) return undefined;
  return a / b;
}

export function normalizeMetrics(raw: RawMetrics): NormalizedMetrics {
  const ctr = safeDiv(raw.clicks, raw.impressions);
  const cpc = safeDiv(raw.spend, raw.clicks);
  const cpm = safeDiv(raw.spend, raw.impressions) !== undefined ? (raw.spend / raw.impressions) * 1000 : undefined;
  const cpa = safeDiv(raw.spend, raw.conversions);
  const roas = safeDiv(raw.revenue, raw.spend);
  const frequency = raw.frequency ?? safeDiv(raw.impressions, raw.reach);

  return {
    impressions: raw.impressions,
    reach: raw.reach,
    clicks: raw.clicks,
    spend: raw.spend,
    conversions: raw.conversions,
    revenue: raw.revenue,
    ctr,
    cpc,
    cpm,
    cpa,
    roas,
    frequency,
  };
}

/** Sums a list of raw metric rows (e.g. daily rows for a campaign/period) into one totals row. */
export function sumRawMetrics(rows: RawMetrics[]): RawMetrics {
  return rows.reduce<RawMetrics>(
    (acc, row) => ({
      impressions: acc.impressions + row.impressions,
      reach: addOptional(acc.reach, row.reach),
      clicks: acc.clicks + row.clicks,
      spend: acc.spend + row.spend,
      conversions: acc.conversions + row.conversions,
      revenue: addOptional(acc.revenue, row.revenue),
      frequency: undefined, // frequency isn't additive; recompute from impressions/reach after summing
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
  );
}

function addOptional(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined && b === undefined) return undefined;
  return (a ?? 0) + (b ?? 0);
}

export function formatCurrency(value: number | undefined, currency = "BRL"): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatPercent(value: number | undefined, digits = 2): string {
  if (value === undefined) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | undefined, digits = 0): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);
}

export function formatRatio(value: number | undefined, digits = 2): string {
  if (value === undefined) return "—";
  return `${value.toFixed(digits)}x`;
}
