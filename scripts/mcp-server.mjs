#!/usr/bin/env node
/**
 * Argus MCP server (G33) — stdio JSON-RPC tools for agents.
 * Usage: node scripts/mcp-server.mjs
 */
import { createInterface } from "readline";

const BASE = process.env.ARGUS_BASE_URL ?? "http://localhost:3000";

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

const tools = [
  { name: "argus_freshness", description: "Get source freshness snapshot", path: "/api/v1/freshness" },
  { name: "argus_findings", description: "List cross-domain findings", path: "/api/v1/findings" },
  { name: "argus_digest", description: "Cross-feed digest (up to 500 items)", path: "/api/v1/digest?limit=100" },
  { name: "argus_country", description: "Country brief — pass iso2 arg", path: null },
];

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function err(id, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message } }) + "\n");
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;

  try {
    if (method === "initialize") {
      respond(id, { protocolVersion: "2024-11-05", serverInfo: { name: "argus-mcp", version: "1.0.0" }, capabilities: { tools: {} } });
      return;
    }
    if (method === "tools/list") {
      respond(id, { tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: { type: "object", properties: {} } })) });
      return;
    }
    if (method === "tools/call") {
      const tool = tools.find((t) => t.name === params?.name);
      if (!tool) return err(id, "unknown tool");
      let path = tool.path;
      if (tool.name === "argus_country") {
        const iso2 = params?.arguments?.iso2 ?? "US";
        path = `/api/v1/country/${encodeURIComponent(iso2)}`;
      }
      const data = await fetchJson(path);
      respond(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
      return;
    }
    err(id, `unsupported method: ${method}`);
  } catch (e) {
    err(id, e instanceof Error ? e.message : String(e));
  }
});
