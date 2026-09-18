import { describe, expect, it } from "vitest";
import { compareNormalized, compareRawMetrics, fieldsMatch, independentRecompute } from "@/lib/diagnostics";
import { normalizeMetrics } from "@/lib/metrics/calc";

describe("independentRecompute vs normalizeMetrics", () => {
  it("agrees with the official calculator on ordinary values", () => {
    const raw = { impressions: 10_000, clicks: 250, spend: 300, conversions: 12, revenue: 900 };
    const official = normalizeMetrics(raw);
    const independent = independentRecompute(raw);
    const comparison = compareNormalized(official, independent);
    expect(comparison.every((c) => c.match)).toBe(true);
  });

  it("agrees that all derived metrics are undefined for an all-zero campaign (no conversions, no spend)", () => {
    const raw = { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
    const official = normalizeMetrics(raw);
    const independent = independentRecompute(raw);
    expect(compareNormalized(official, independent).every((c) => c.match)).toBe(true);
    expect(independent.ctr).toBeUndefined();
    expect(independent.cpa).toBeUndefined();
  });

  it("would flag a real regression: a deliberately wrong 'official' value fails the comparison", () => {
    const raw = { impressions: 1000, clicks: 100, spend: 50, conversions: 5 };
    const brokenOfficial = { ...normalizeMetrics(raw), ctr: 0.5 }; // wrong on purpose
    const independent = independentRecompute(raw);
    const comparison = compareNormalized(brokenOfficial, independent);
    expect(comparison.find((c) => c.field === "ctr")?.match).toBe(false);
  });
});

describe("fieldsMatch", () => {
  it("treats both-undefined as a match", () => {
    expect(fieldsMatch(undefined, undefined)).toBe(true);
  });

  it("treats one-undefined-one-defined as a mismatch", () => {
    expect(fieldsMatch(1, undefined)).toBe(false);
    expect(fieldsMatch(undefined, 1)).toBe(false);
  });

  it("tolerates tiny floating point noise but not real differences", () => {
    expect(fieldsMatch(1.0000001, 1.0000002)).toBe(true);
    expect(fieldsMatch(100, 120)).toBe(false);
  });
});

describe("compareRawMetrics", () => {
  it("flags a real mismatch between stored and live raw values (e.g. sync drifted from the provider)", () => {
    const stored = { impressions: 1000, clicks: 50, spend: 40, conversions: 2 };
    const live = { impressions: 1200, clicks: 50, spend: 40, conversions: 2 };
    const comparison = compareRawMetrics(stored, live);
    expect(comparison.find((c) => c.field === "impressions")?.match).toBe(false);
    expect(comparison.find((c) => c.field === "clicks")?.match).toBe(true);
  });
});
