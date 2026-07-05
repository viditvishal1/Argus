#!/usr/bin/env node
/**
 * Migration order verification and backup reminder (Phase 7).
 * With DATABASE_URL, runs a read-only connectivity check only.
 *
 * Usage:
 *   node scripts/migrate-check.mjs
 *   DATABASE_URL=postgres://... node scripts/migrate-check.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const dir = join(root, "supabase/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log("Apply migrations in Supabase SQL Editor or via psql, in this order:\n");
for (const f of files) {
  const firstLine = readFileSync(join(dir, f), "utf8").split("\n")[0]?.slice(0, 72) ?? "";
  console.log(`  ${f}  ${firstLine.startsWith("--") ? firstLine : ""}`);
}

console.log("\nBefore applying in production:");
console.log("  1. DATABASE_URL=... node scripts/backup-db.mjs pre-migration.sql");
console.log("  2. Apply on staging first; run: ARGUS_APP_URL=... npm run staging-parity");
console.log("  3. Rollback: psql \"$DATABASE_URL\" < pre-migration.sql\n");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL not set — skipping connectivity check.");
  process.exit(0);
}

try {
  execSync(`psql "${url}" -c "SELECT 1 AS ok"`, { stdio: "pipe", encoding: "utf8" });
  console.log("✓ DATABASE_URL reachable");
} catch {
  console.error("✗ DATABASE_URL set but psql connectivity failed (install client tools or check URL)");
  process.exit(1);
}
