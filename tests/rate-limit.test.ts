import { afterEach, describe, expect, it, vi } from "vitest";
import { checkCooldown } from "@/lib/rate-limit";

describe("checkCooldown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first call for a given key", () => {
    const result = checkCooldown(`test-key-${Math.random()}`, 1000);
    expect(result.allowed).toBe(true);
  });

  it("blocks a second call within the cooldown window and reports retryAfterMs", () => {
    const key = `test-key-${Math.random()}`;
    expect(checkCooldown(key, 30_000).allowed).toBe(true);
    const second = checkCooldown(key, 30_000);
    expect(second.allowed).toBe(false);
    if (!second.allowed) {
      expect(second.retryAfterMs).toBeGreaterThan(0);
      expect(second.retryAfterMs).toBeLessThanOrEqual(30_000);
    }
  });

  it("allows again once the cooldown window has elapsed", () => {
    vi.useFakeTimers();
    const key = `test-key-${Math.random()}`;
    expect(checkCooldown(key, 10_000).allowed).toBe(true);
    expect(checkCooldown(key, 10_000).allowed).toBe(false);
    vi.advanceTimersByTime(10_001);
    expect(checkCooldown(key, 10_000).allowed).toBe(true);
  });

  it("tracks cooldowns independently per key", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    expect(checkCooldown(keyA, 30_000).allowed).toBe(true);
    expect(checkCooldown(keyB, 30_000).allowed).toBe(true);
  });
});
