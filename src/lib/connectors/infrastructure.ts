// Infrastructure Monitor connectors — internet/cloud platform health via
// public Statuspage APIs (free, no key), covering the services most of the
// internet depends on. Incidents become feed items; component status becomes
// the module's status board.

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

const STATUS_PAGES: { name: string; host: string; kind: string }[] = [
  { name: "GitHub", host: "www.githubstatus.com", kind: "developer platform" },
  { name: "Cloudflare", host: "www.cloudflarestatus.com", kind: "CDN / DNS" },
  { name: "Vercel", host: "www.vercel-status.com", kind: "hosting" },
  { name: "OpenAI", host: "status.openai.com", kind: "AI platform" },
  { name: "Discord", host: "discordstatus.com", kind: "communications" },
  { name: "Reddit", host: "www.redditstatus.com", kind: "social platform" },
  { name: "Dropbox", host: "status.dropbox.com", kind: "storage" },
  { name: "Twilio", host: "status.twilio.com", kind: "communications API" },
];

const INDICATOR_SEVERITY: Record<string, number> = {
  none: 0, minor: 3, major: 7, critical: 10, maintenance: 1,
};

export interface PlatformStatus {
  name: string;
  kind: string;
  indicator: string;
  description: string;
  url: string;
  fetchedAt: string;
}

export async function fetchPlatformStatuses(): Promise<PlatformStatus[]> {
  const results = await Promise.allSettled(
    STATUS_PAGES.map(async (p) => {
      const res = await fetchWithTimeout(`https://${p.host}/api/v2/status.json`, {
        timeoutMs: 8000,
      });
      if (!res.ok) throw new Error(`${p.name} HTTP ${res.status}`);
      const data = await res.json();
      return {
        name: p.name,
        kind: p.kind,
        indicator: data.status.indicator as string,
        description: data.status.description as string,
        url: `https://${p.host}`,
        fetchedAt: new Date().toISOString(),
      };
    }),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<PlatformStatus> => r.status === "fulfilled")
    .map((r) => r.value);
}

registerConnector(
  {
    id: "statuspage_incidents",
    module: "infrastructure",
    source: "Statuspage network",
    sourceUrl: "https://www.atlassian.com/software/statuspage",
    scheduleSeconds: 300,
    contentPolicy: "full_cache",
    entityTypes: ["organization", "event"],
  },
  async () => {
    const results = await Promise.allSettled(
      STATUS_PAGES.map(async (p) => {
        const res = await fetchWithTimeout(`https://${p.host}/api/v2/incidents/unresolved.json`, {
          timeoutMs: 8000,
        });
        if (!res.ok) throw new Error(`${p.name} HTTP ${res.status}`);
        const data = await res.json();
        interface Incident {
          id: string; name: string; status: string; impact: string;
          created_at: string; shortlink: string;
          incident_updates: { body: string }[];
        }
        return (data.incidents as Incident[]).map((inc): Item => ({
          id: `incident:${p.name}:${inc.id}`,
          module: "infrastructure",
          connectorId: "statuspage_incidents",
          title: `${p.name}: ${inc.name}`,
          summary: inc.incident_updates[0]?.body?.slice(0, 300),
          body: inc.incident_updates.map((u) => u.body).join("\n\n"),
          source: `${p.name} Status`,
          url: inc.shortlink,
          timestamp: inc.created_at,
          severity: INDICATOR_SEVERITY[inc.impact] ?? 5,
          severityLabel: inc.impact.toUpperCase(),
          tags: ["incident", inc.status, p.kind.replace(/\s|\//g, "-")],
          entities: [
            { name: p.name, type: "organization" },
            { name: inc.name, type: "event" },
          ],
          contentPolicy: "full_cache",
        }));
      }),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<Item[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);
  },
);

export const INFRASTRUCTURE_CONNECTOR_IDS = ["statuspage_incidents"];
