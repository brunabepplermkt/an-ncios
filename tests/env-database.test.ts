import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveDatabaseEnv } from "@/lib/env-database";

const ENV_KEYS = ["DATABASE_URL", "DIRECT_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("resolveDatabaseEnv (Vercel Supabase integration compatibility)", () => {
  it("leaves DATABASE_URL/DIRECT_URL untouched when already set (plain .env / manual setup)", () => {
    process.env.DATABASE_URL = "postgresql://explicit-pooled";
    process.env.DIRECT_URL = "postgresql://explicit-direct";
    process.env.POSTGRES_PRISMA_URL = "postgresql://should-be-ignored";

    resolveDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe("postgresql://explicit-pooled");
    expect(process.env.DIRECT_URL).toBe("postgresql://explicit-direct");
  });

  it("falls back to POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING (Vercel's Supabase integration names)", () => {
    process.env.POSTGRES_PRISMA_URL = "postgresql://pooled-from-vercel-supabase";
    process.env.POSTGRES_URL_NON_POOLING = "postgresql://direct-from-vercel-supabase";

    resolveDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe("postgresql://pooled-from-vercel-supabase");
    expect(process.env.DIRECT_URL).toBe("postgresql://direct-from-vercel-supabase");
  });

  it("falls back to POSTGRES_URL when POSTGRES_PRISMA_URL isn't set", () => {
    process.env.POSTGRES_URL = "postgresql://generic-postgres-url";

    resolveDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe("postgresql://generic-postgres-url");
  });

  it("falls back DIRECT_URL to the resolved DATABASE_URL when no non-pooling variant exists", () => {
    process.env.POSTGRES_PRISMA_URL = "postgresql://pooled-only";

    resolveDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe("postgresql://pooled-only");
    expect(process.env.DIRECT_URL).toBe("postgresql://pooled-only");
  });

  it("leaves both undefined when nothing is configured (surfaces the real Prisma error instead of hiding it)", () => {
    resolveDatabaseEnv();

    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.DIRECT_URL).toBeUndefined();
  });
});
