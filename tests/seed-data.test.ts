import { describe, expect, it } from "vitest";
import { DEMO_CAMPAIGNS, generateDailyMetrics } from "@/lib/demo/seed-data";

describe("generateDailyMetrics", () => {
  it("generates exactly N days of data, oldest first", () => {
    const profile = DEMO_CAMPAIGNS[0];
    const rows = generateDailyMetrics(profile, 30);
    expect(rows).toHaveLength(30);
    expect(rows[0].date.getTime()).toBeLessThan(rows[29].date.getTime());
  });

  it("never produces negative spend/clicks/impressions", () => {
    for (const profile of DEMO_CAMPAIGNS) {
      const rows = generateDailyMetrics(profile, 14);
      for (const row of rows) {
        expect(row.impressions).toBeGreaterThanOrEqual(0);
        expect(row.clicks).toBeGreaterThanOrEqual(0);
        expect(row.spend).toBeGreaterThanOrEqual(0);
        expect(row.conversions).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("applies a real CTR decay for campaigns flagged with a fatigue trend", () => {
    const profile = DEMO_CAMPAIGNS.find((p) => p.trend === "fatigue")!;
    const rows = generateDailyMetrics(profile, 30);
    const earlyCtr = rows[5].clicks / rows[5].impressions;
    const recentCtr = rows[29].clicks / rows[29].impressions;
    expect(recentCtr).toBeLessThan(earlyCtr);
  });

  it("is deterministic for the same profile key", () => {
    const profile = DEMO_CAMPAIGNS[0];
    const a = generateDailyMetrics(profile, 10);
    const b = generateDailyMetrics(profile, 10);
    expect(a.map((r) => r.spend)).toEqual(b.map((r) => r.spend));
  });
});
