#!/usr/bin/env node
/**
 * Argus CLI (G34) — lightweight ops client.
 * Usage: node scripts/argus-cli.mjs <command> [args]
 */
const BASE = process.env.ARGUS_BASE_URL ?? "http://localhost:3000";
const TOKEN = process.env.ARGUS_API_TOKEN ?? "";

const [cmd, arg] = process.argv.slice(2);

async function get(path) {
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("json") ? res.json() : res.text();
}

const commands = {
  async status() {
    console.log(JSON.stringify(await get("/api/status"), null, 2));
  },
  async freshness() {
    console.log(JSON.stringify(await get("/api/v1/freshness"), null, 2));
  },
  async digest() {
    console.log(JSON.stringify(await get("/api/v1/digest?limit=50"), null, 2));
  },
  async country() {
    const iso2 = arg ?? "US";
    console.log(JSON.stringify(await get(`/api/v1/country/${iso2}`), null, 2));
  },
  async export() {
    const iso2 = arg ?? "US";
    console.log(await get(`/api/v1/country/${iso2}/export?format=markdown`));
  },
  async openapi() {
    console.log(JSON.stringify(await get("/api/v1/openapi"), null, 2));
  },
  help() {
    console.log(`Argus CLI — commands: status, freshness, digest, country <iso2>, export <iso2>, openapi`);
    console.log(`Env: ARGUS_BASE_URL, ARGUS_API_TOKEN`);
  },
};

(async () => {
  const fn = commands[cmd] ?? commands.help;
  try {
    await fn();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
