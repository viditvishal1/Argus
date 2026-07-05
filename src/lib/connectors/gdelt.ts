// GDELT global events connector — config-driven, keyless public API.

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

registerConnector(
  {
    id: "gdelt_events",
    module: "news",
    source: "GDELT Project",
    sourceUrl: "https://www.gdeltproject.org",
    scheduleSeconds: 600,
    contentPolicy: "metadata_only",
    entityTypes: ["event", "location", "organization"],
  },
  async () => {
    const url =
      "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=artlist&maxrecords=50&format=json&timespan=24h";
    const res = await fetchWithTimeout(url, { timeoutMs: 15000 });
    if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
    const data = await res.json();
    const articles: { url: string; title: string; seendate: string; domain: string; language: string }[] =
      data.articles ?? [];
    return articles.map((a): Item => ({
      id: `gdelt:${a.url.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`,
      module: "news",
      connectorId: "gdelt_events",
      title: a.title || a.domain,
      summary: `${a.domain} · global event signal`,
      url: a.url,
      source: "GDELT",
      timestamp: a.seendate?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z") ?? new Date().toISOString(),
      tags: ["gdelt", "global", a.language ?? "en"],
      entities: [{ name: a.domain, type: "organization" }],
      contentPolicy: "metadata_only",
      region: "global",
      extra: { provider: "GDELT", geographicScope: "global", dataDelay: "15min+" },
    }));
  },
);

export const GDELT_CONNECTOR_ID = "gdelt_events";
