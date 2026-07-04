// Cyber Intelligence connectors — NVD recent CVEs + CISA Known Exploited
// Vulnerabilities. Both are free US-government feeds, no key required.

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

function nvdDate(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, ".000");
}

registerConnector(
  {
    id: "nvd_cves",
    module: "cyber",
    source: "NVD",
    sourceUrl: "https://nvd.nist.gov",
    scheduleSeconds: 1800,
    contentPolicy: "full_cache",
    entityTypes: ["technology", "organization"],
  },
  async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
    const url =
      `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=60` +
      `&pubStartDate=${encodeURIComponent(nvdDate(start))}` +
      `&pubEndDate=${encodeURIComponent(nvdDate(end))}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 15000 });
    if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
    const data = await res.json();
    interface NvdVuln {
      cve: {
        id: string;
        published: string;
        descriptions: { lang: string; value: string }[];
        metrics?: {
          cvssMetricV31?: { cvssData: { baseScore: number; baseSeverity: string } }[];
          cvssMetricV40?: { cvssData: { baseScore: number; baseSeverity: string } }[];
        };
        configurations?: { nodes: { cpeMatch: { criteria: string }[] }[] }[];
        references?: { url: string }[];
      };
    }
    return (data.vulnerabilities as NvdVuln[]).map(({ cve }): Item => {
      const desc = cve.descriptions.find((d) => d.lang === "en")?.value ?? "";
      const cvss =
        cve.metrics?.cvssMetricV31?.[0]?.cvssData ??
        cve.metrics?.cvssMetricV40?.[0]?.cvssData;
      const vendors = new Set<string>();
      for (const conf of cve.configurations ?? []) {
        for (const node of conf.nodes) {
          for (const m of node.cpeMatch) {
            const vendor = m.criteria.split(":")[3];
            if (vendor && vendor !== "*") vendors.add(vendor.replace(/_/g, " "));
          }
        }
      }
      return {
        id: `cve:${cve.id}`,
        module: "cyber",
        connectorId: "nvd_cves",
        title: cve.id,
        summary: desc.slice(0, 300),
        body: desc,
        url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        source: "NVD",
        timestamp: cve.published,
        severity: cvss?.baseScore,
        severityLabel: cvss?.baseSeverity ?? "UNRATED",
        tags: ["cve", ...(cvss ? [cvss.baseSeverity.toLowerCase()] : ["unrated"])],
        entities: [
          { name: cve.id, type: "technology" },
          ...[...vendors].slice(0, 4).map((v) => ({ name: v, type: "organization" as const })),
        ],
        contentPolicy: "full_cache",
        extra: { references: cve.references?.slice(0, 5).map((r) => r.url) },
      };
    });
  },
);

registerConnector(
  {
    id: "cisa_kev",
    module: "cyber",
    source: "CISA KEV",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    scheduleSeconds: 3600,
    contentPolicy: "full_cache",
    entityTypes: ["technology", "organization"],
  },
  async () => {
    const res = await fetchWithTimeout(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { timeoutMs: 12000 },
    );
    if (!res.ok) throw new Error(`CISA HTTP ${res.status}`);
    const data = await res.json();
    interface KevVuln {
      cveID: string;
      vendorProject: string;
      product: string;
      vulnerabilityName: string;
      dateAdded: string;
      shortDescription: string;
      requiredAction: string;
      dueDate: string;
      knownRansomwareCampaignUse: string;
    }
    return (data.vulnerabilities as KevVuln[])
      .slice(-40)
      .reverse()
      .map((v): Item => ({
        id: `kev:${v.cveID}`,
        module: "cyber",
        connectorId: "cisa_kev",
        title: `${v.cveID} — ${v.vulnerabilityName}`,
        summary: v.shortDescription,
        body: `${v.shortDescription}\n\nRequired action: ${v.requiredAction}\nRemediation due: ${v.dueDate}\nKnown ransomware campaign use: ${v.knownRansomwareCampaignUse}`,
        url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
        source: "CISA KEV",
        timestamp: new Date(v.dateAdded).toISOString(),
        severity: 9, // being on KEV means active exploitation in the wild
        severityLabel: "EXPLOITED",
        tags: [
          "kev",
          "exploited",
          ...(v.knownRansomwareCampaignUse === "Known" ? ["ransomware"] : []),
        ],
        entities: [
          { name: v.cveID, type: "technology" },
          { name: v.vendorProject, type: "organization" },
          { name: v.product, type: "technology" },
        ],
        contentPolicy: "full_cache",
      }));
  },
);

export const CYBER_CONNECTOR_IDS = ["nvd_cves", "cisa_kev"];
