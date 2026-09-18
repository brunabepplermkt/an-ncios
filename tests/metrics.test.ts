import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercent, normalizeMetrics, sumRawMetrics } from "@/lib/metrics/calc";

describe("normalizeMetrics", () => {
  it("computes CTR, CPC, CPM, CPA, ROAS from raw counters", () => {
    const result = normalizeMetrics({
      impressions: 10_000,
      clicks: 200,
      spend: 300,
      conversions: 10,
      revenue: 900,
      reach: 5_000,
    });

    expect(result.ctr).toBeCloseTo(0.02);
    expect(result.cpc).toBeCloseTo(1.5);
    expect(result.cpm).toBeCloseTo(30);
    expect(result.cpa).toBeCloseTo(30);
    expect(result.roas).toBeCloseTo(3);
    expect(result.frequency).toBeCloseTo(2);
  });

  it("returns undefined instead of NaN/Infinity for missing or zero denominators", () => {
    const result = normalizeMetrics({ impressions: 0, clicks: 0, spend: 0, conversions: 0 });
    expect(result.ctr).toBeUndefined();
    expect(result.cpc).toBeUndefined();
    expect(result.cpm).toBeUndefined();
    expect(result.cpa).toBeUndefined();
    expect(result.roas).toBeUndefined();
    expect(result.frequency).toBeUndefined();
  });

  it("does not fabricate revenue/reach when the platform never reported them", () => {
    const result = normalizeMetrics({ impressions: 1000, clicks: 20, spend: 50, conversions: 2 });
    expect(result.revenue).toBeUndefined();
    expect(result.roas).toBeUndefined();
    expect(result.reach).toBeUndefined();
    expect(result.frequency).toBeUndefined();
  });
});

describe("sumRawMetrics", () => {
  it("sums additive fields and keeps optional fields optional when absent everywhere", () => {
    const total = sumRawMetrics([
      { impressions: 100, clicks: 5, spend: 10, conversions: 1 },
      { impressions: 200, clicks: 10, spend: 20, conversions: 2 },
    ]);
    expect(total).toEqual({ impressions: 300, clicks: 15, spend: 30, conversions: 3, reach: undefined, revenue: undefined, frequency: undefined });
  });

  it("sums revenue/reach when present on at least one row", () => {
    const total = sumRawMetrics([
      { impressions: 100, clicks: 5, spend: 10, conversions: 1, revenue: 40, reach: 80 },
      { impressions: 200, clicks: 10, spend: 20, conversions: 2 },
    ]);
    expect(total.revenue).toBe(40);
    expect(total.reach).toBe(80);
  });
});

describe("formatters", () => {
  it("formats currency and percent, and renders — for undefined", () => {
    expect(formatCurrency(10, "BRL")).toContain("10");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatPercent(0.1234)).toBe("12.34%");
    expect(formatPercent(undefined)).toBe("—");
  });
});
