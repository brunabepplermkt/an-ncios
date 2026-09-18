import { describe, expect, it } from "vitest";
import { previousPeriod, resolvePeriod } from "@/lib/data/period";

describe("resolvePeriod", () => {
  it("resolves 7d/14d/30d to the right number of days", () => {
    expect(resolvePeriod("7d", "UTC").days).toBe(7);
    expect(resolvePeriod("14d", "UTC").days).toBe(14);
    expect(resolvePeriod("30d", "UTC").days).toBe(30);
  });

  it("resolves a custom range inclusively", () => {
    const period = resolvePeriod("custom", "UTC", "2026-01-01", "2026-01-10");
    expect(period.days).toBe(10);
    expect(period.start.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(period.end.toISOString().slice(0, 10)).toBe("2026-01-10");
  });

  it("today/yesterday are exactly 1 day", () => {
    expect(resolvePeriod("today", "UTC").days).toBe(1);
    expect(resolvePeriod("yesterday", "UTC").days).toBe(1);
  });

  it("yesterday ends exactly 1ms before today starts", () => {
    const today = resolvePeriod("today", "UTC");
    const yesterday = resolvePeriod("yesterday", "UTC");
    expect(yesterday.end.getTime()).toBe(today.start.getTime() - 1);
  });

  it("last_month resolves to a full calendar month, not the current one", () => {
    const thisMonth = resolvePeriod("this_month", "UTC");
    const lastMonth = resolvePeriod("last_month", "UTC");
    expect(lastMonth.end.getTime()).toBeLessThan(thisMonth.start.getTime());
    // last_month's start-of-month date must differ from this_month's
    expect(lastMonth.start.toISOString().slice(0, 7)).not.toBe(thisMonth.start.toISOString().slice(0, 7));
  });

  it("is timezone-aware: the same calendar day starts at different UTC instants in different zones", () => {
    const utc = resolvePeriod("custom", "UTC", "2026-06-15", "2026-06-15");
    const saoPaulo = resolvePeriod("custom", "America/Sao_Paulo", "2026-06-15", "2026-06-15");
    // America/Sao_Paulo is UTC-3 in June (no DST since 2019), so local midnight
    // there is 03:00 UTC — 3 hours after UTC midnight for the same calendar date.
    expect(saoPaulo.start.getTime() - utc.start.getTime()).toBe(3 * 60 * 60 * 1000);
  });
});

describe("previousPeriod", () => {
  it("returns a same-length window immediately before the given period", () => {
    const period = resolvePeriod("custom", "UTC", "2026-01-11", "2026-01-20"); // 10 days
    const prev = previousPeriod(period);
    expect(prev.days).toBe(10);
    expect(prev.end.getTime()).toBeLessThan(period.start.getTime());
    expect(prev.start.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});
