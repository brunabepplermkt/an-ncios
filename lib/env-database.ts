/**
 * Resolves DATABASE_URL/DIRECT_URL before PrismaClient is constructed.
 *
 * Our schema (prisma/schema.prisma) reads `env("DATABASE_URL")` /
 * `env("DIRECT_URL")` literally. But Vercel's native Supabase integration
 * (Storage/Marketplace tab, "Connect") does NOT create those — it creates
 * `POSTGRES_PRISMA_URL` (pooled, meant for ORMs) and
 * `POSTGRES_URL_NON_POOLING` (direct), matching the same convention Vercel
 * uses for its own Postgres product. Without this, DATABASE_URL is simply
 * undefined in production and every DB call fails.
 *
 * Called from the top of lib/db.ts, before the first `new PrismaClient()`.
 * Never overwrites an explicitly-set DATABASE_URL/DIRECT_URL (e.g. from a
 * plain .env in local dev).
 */
export function resolveDatabaseEnv(): void {
  if (!process.env.DATABASE_URL) {
    const pooled = process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
    if (pooled) process.env.DATABASE_URL = pooled;
  }

  if (!process.env.DIRECT_URL) {
    const direct = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
    if (direct) process.env.DIRECT_URL = direct;
  }
}

resolveDatabaseEnv();
