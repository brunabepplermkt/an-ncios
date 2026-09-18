import type { NormalizedMetrics, RawMetrics } from "@/lib/metrics/types";

export interface IndependentCheck {
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number;
  roas?: number;
}

/**
 * Recomputes CTR/CPC/CPM/CPA/ROAS from raw counters WITHOUT importing
 * lib/metrics/calc.ts — a deliberately separate implementation so the
 * diagnostics tool can catch a bug in the "real" calculator instead of
 * silently agreeing with it. Only meaningful when both sides are compared;
 * see fieldsMatch().
 */
export function independentRecompute(raw: RawMetrics): IndependentCheck {
  const out: IndependentCheck = {};
  if (raw.impressions > 0) out.ctr = raw.clicks / raw.impressions;
  if (raw.clicks > 0) out.cpc = raw.spend / raw.clicks;
  if (raw.impressions > 0) out.cpm = (raw.spend / raw.impressions) * 1000;
  if (raw.conversions > 0) out.cpa = raw.spend / raw.conversions;
  if (raw.revenue !== undefined && raw.spend > 0) out.roas = raw.revenue / raw.spend;
  return out;
}

/** Numeric equality with a small relative tolerance for floating point noise — never rounds before comparing. */
export function fieldsMatch(a: number | undefined, b: number | undefined, relativeTolerance = 0.005): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) <= relativeTolerance * Math.max(Math.abs(a), Math.abs(b), 1);
}

export interface RawFieldComparison {
  field: keyof RawMetrics;
  stored: number | undefined;
  live: number | undefined;
  match: boolean;
}

export function compareRawMetrics(stored: RawMetrics, live: RawMetrics): RawFieldComparison[] {
  const fields: Array<keyof RawMetrics> = ["impressions", "clicks", "spend", "conversions", "reach", "revenue", "frequency"];
  return fields.map((field) => ({
    field,
    stored: stored[field],
    live: live[field],
    match: fieldsMatch(stored[field], live[field]),
  }));
}

export interface NormalizedFieldComparison {
  field: keyof IndependentCheck;
  official: number | undefined;
  independent: number | undefined;
  match: boolean;
}

export function compareNormalized(official: NormalizedMetrics, independent: IndependentCheck): NormalizedFieldComparison[] {
  const fields: Array<keyof IndependentCheck> = ["ctr", "cpc", "cpm", "cpa", "roas"];
  return fields.map((field) => ({
    field,
    official: official[field],
    independent: independent[field],
    match: fieldsMatch(official[field], independent[field]),
  }));
}
