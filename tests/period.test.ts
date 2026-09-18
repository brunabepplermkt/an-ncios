import { describe, expect, it } from "vitest";
import { previousPeriod, resolvePeriod } from "@/lib/data/period";

describe("resolvePeriod", () => {
  it("resolves 7d/14d/30d to the right number of days", () => {
    expect(resolvePeriod("7d").days).toBe(7);
    expect(resolvePeriod("14d").days).toBe(14);
    expect(resolvePeriod("30d").days).toBe(30);
  });

  it("resolves a custom range inclusively", () => {
    const period = resolvePeriod("custom", "2026-01-01", "2026-01-10");
    expect(period.days).toBe(10);
    expect(period.start.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});

describe("previousPeriod", () => {
  it("returns a same-length window immediately before the given period", () => {
    const period = resolvePeriod("custom", "2026-01-11", "2026-01-20"); // 10 days
    const prev = previousPeriod(period);
    expect(prev.days).toBe(10);
    expect(prev.end.getTime()).toBeLessThan(period.start.getTime());
    expect(prev.start.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});
