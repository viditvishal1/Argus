#!/usr/bin/env node
/**
 * Staging/production parity checklist (Phase 7).
 * No secrets printed. Optional CRON_SECRET enables live-seed verification.
 *
 * Usage:
 *   ARGUS_APP_URL=https://staging.example.com npm run staging-parity
 *   ARGUS_APP_URL=... CRON_SECRET=... npm run staging-parity
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const base = (process.env.ARGUS_APP_URL ?? process.env.VERCEL_URL ?? "").replace(/\/$/, "");
const cronSecret =
  process.env.CRON_SECRET ?? process.env.ARGUS_ADMIN_SECRET ?? process.env.EARTHOS_ADMIN_SECRET;

let failed = 0;

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.log(`✗ ${msg}`);
  failed += 1;
}

async function fetchJson(path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers, cache: "no-store" });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function main() {
  if (!base) {
    console.error("ARGUS_APP_URL is required");
    process.exit(1);
  }

  console.log(`Staging parity — ${base}\n`);

  const status = await fetchJson("/api/status");
  if (status.status === 200) pass("/api/status OK");
  else fail(`/api/status HTTP ${status.status}`);

  const freshness = await fetchJson("/api/v1/freshness");
  if (freshness.status === 200 && freshness.body.methodologyVersion) {
    pass(`/api/v1/freshness (${freshness.body.overall ?? "unknown"})`);
  } else fail("/api/v1/freshness failed");

  const variants = await fetchJson("/api/v1/variants");
  if (variants.status === 200 && Array.isArray(variants.body.variants)) {
    pass(`/api/v1/variants (${variants.body.variants.length} variants)`);
  } else fail("/api/v1/variants failed");

  const metrics = await fetchJson("/api/v1/metrics");
  if (metrics.status === 200) pass("/api/v1/metrics exposed");
  else console.log(`  · /api/v1/metrics HTTP ${metrics.status} (optional)`);

  const redis = await fetchJson("/api/health/redis");
  if (redis.body.configured) pass(`Redis configured (${redis.body.scheme})`);
  else console.log("  · Redis not configured (acceptable for cold start)");

  const live = await fetchJson("/api/health/live-data");
  if (live.body.cronSecretConfigured) pass("CRON_SECRET configured on server");
  else console.log("  · CRON_SECRET not set — cron routes will reject in production");

  if (cronSecret) {
    const cron = await fetchJson("/api/cron/live", {
      Authorization: `Bearer ${cronSecret}`,
    });
    if (cron.status === 200 && cron.body.ok) pass("Cron live seed OK");
    else if (cron.status === 409) pass("Cron live seed busy (409) — acceptable");
    else fail(`Cron live seed HTTP ${cron.status}`);
  } else {
    console.log("  · Skipping cron live seed (set CRON_SECRET to verify)");
  }

  const migrations = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  pass(`Local migration bundle: ${migrations.length} files (001–${migrations.at(-1)?.slice(0, 3) ?? "?"})`);

  console.log(failed === 0 ? "\nParity checks passed." : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
