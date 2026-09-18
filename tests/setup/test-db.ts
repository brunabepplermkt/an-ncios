import { execSync } from "node:child_process";

/**
 * The schema's datasource is Postgres now (Supabase), so tests that touch
 * the database need a real Postgres to push the schema into — a throwaway
 * SQLite file (the old approach) no longer works: the schema's `provider`
 * is a fixed literal, not env-driven, so it rejects a `file:` URL outright.
 *
 * Set TEST_DATABASE_URL (and optionally TEST_DIRECT_URL) to a disposable
 * Postgres database to actually run these tests — e.g. a separate Supabase
 * project, a local `docker run postgres`, or a dedicated schema on the same
 * instance. Without it, DB-backed test files skip themselves (via
 * `describe.skipIf(!hasTestDatabase)`) instead of failing the build.
 */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

const prepared = new Set<string>();

function withSchema(url: string, schema: string): string {
  const u = new URL(url);
  u.searchParams.set("schema", schema);
  return u.toString();
}

/**
 * Points DATABASE_URL/DIRECT_URL at a Postgres **schema** dedicated to this
 * test file (inside the shared TEST_DATABASE_URL database) and pushes the
 * app schema into it — never the real Supabase database the running app's
 * data lives in, and never another test file's schema.
 *
 * `suffix` MUST be unique per test file. Vitest runs test files
 * concurrently; without a schema per file, two files' beforeEach(resetDb)
 * would race and delete each other's rows mid-test (this bit us with the
 * old shared-SQLite-file setup — same root cause, different backend).
 *
 * Call this synchronously as the very first thing in a test file, before
 * any `await import("@/lib/db")`, since PrismaClient reads DATABASE_URL at
 * construction time. No-ops when `hasTestDatabase` is false — callers must
 * check that themselves and skip via `describe.skipIf`.
 */
export function prepareTestDatabase(suffix: string): void {
  if (!hasTestDatabase || prepared.has(suffix)) return;
  const databaseUrl = withSchema(process.env.TEST_DATABASE_URL!, `test_${suffix}`);
  const directUrl = withSchema(process.env.TEST_DIRECT_URL ?? process.env.TEST_DATABASE_URL!, `test_${suffix}`);
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = directUrl;
  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
    stdio: "pipe",
  });
  prepared.add(suffix);
}
