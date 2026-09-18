const lastCallAt = new Map<string, number>();

/**
 * Minimal in-memory cooldown — enough for a single-user local tool to avoid
 * hammering Meta/Google (or accidentally double-clicking "Sincronizar") into
 * a rate limit. Not distributed/multi-instance safe; that's out of scope here.
 */
export function checkCooldown(key: string, minIntervalMs: number): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const last = lastCallAt.get(key);
  const now = Date.now();
  if (last !== undefined && now - last < minIntervalMs) {
    return { allowed: false, retryAfterMs: minIntervalMs - (now - last) };
  }
  lastCallAt.set(key, now);
  return { allowed: true };
}
