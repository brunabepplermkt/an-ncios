import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

let prepared = false;

/**
 * Points DATABASE_URL at a throwaway, per-test-file SQLite file and pushes
 * the schema into it — deliberately NEVER the dev.db the running app/demo
 * data lives in. Call this synchronously as the very first thing in a test
 * file, before any `await import("@/lib/db")`, since PrismaClient reads
 * DATABASE_URL at construction time.
 *
 * `suffix` MUST be unique per test file (e.g. the file's own name). Vitest
 * runs test files concurrently, and SQLite file access isn't isolated by
 * Vitest's module/worker isolation — two files sharing one .db file race
 * on each other's beforeEach(resetDb) even when everything else is
 * correctly isolated. A dedicated file per test file avoids that entirely.
 */
export function prepareTestDatabase(suffix: string): void {
  if (prepared) return;
  const dbFile = path.join(process.cwd(), "prisma", `test-${suffix}.db`);
  if (existsSync(dbFile)) rmSync(dbFile);
  const databaseUrl = `file:${dbFile}`;
  process.env.DATABASE_URL = databaseUrl;
  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
  prepared = true;
}
