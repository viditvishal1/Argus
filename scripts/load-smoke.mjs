#!/usr/bin/env node
/**
 * Lightweight load smoke (Phase 6) — concurrent reads against public endpoints.
 * Usage: ARGUS_APP_URL=http://localhost:3000 npm run load-smoke
 */
const base = (process.env.ARGUS_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const concurrency = Number(process.env.LOAD_SMOKE_CONCURRENCY ?? 8);
const rounds = Number(process.env.LOAD_SMOKE_ROUNDS ?? 3);

const paths = ["/api/bootstrap", "/api/v1/freshness", "/api/v1/variants", "/api/status"];

async function hit(path) {
  const started = Date.now();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  return { path, status: res.status, ms: Date.now() - started };
}

async function main() {
  console.log(`Load smoke — ${base} (${concurrency} concurrent × ${rounds} rounds)\n`);
  const results = [];

  for (let r = 0; r < rounds; r += 1) {
    const batch = await Promise.all(
      Array.from({ length: concurrency }, (_, i) => hit(paths[i % paths.length])),
    );
    results.push(...batch);
  }

  const failed = results.filter((r) => r.status < 200 || r.status >= 400);
  const durations = results.map((r) => r.ms);
  const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] ?? 0;

  for (const r of results.slice(0, 12)) {
    console.log(`  ${r.status} ${r.path} ${r.ms}ms`);
  }
  if (results.length > 12) console.log(`  … ${results.length - 12} more`);

  console.log(`\nTotal: ${results.length} requests, ${failed.length} failed, p95 ${p95}ms`);

  if (failed.length > 0) {
    console.error("Load smoke failed.");
    process.exit(1);
  }
  console.log("Load smoke passed.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
