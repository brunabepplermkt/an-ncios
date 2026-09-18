export type Platform = "META" | "GOOGLE";

/**
 * Raw counters as reported by a platform for a given period.
 * Every field besides impressions/clicks/spend is optional because
 * not every platform (or every account) reports it.
 */
export interface RawMetrics {
  impressions: number;
  reach?: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue?: number;
  frequency?: number;
}

/**
 * Derived, comparable metrics. Undefined means "not computable / not
 * reported" (e.g. divide-by-zero or the platform never sent the input),
 * never 0 — the UI renders those as "—" instead of a misleading 0.
 */
export interface NormalizedMetrics {
  impressions: number;
  reach?: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue?: number;
  ctr?: number; // clicks / impressions
  cpc?: number; // spend / clicks
  cpm?: number; // spend / impressions * 1000
  cpa?: number; // spend / conversions
  roas?: number; // revenue / spend
  frequency?: number; // impressions / reach
}
