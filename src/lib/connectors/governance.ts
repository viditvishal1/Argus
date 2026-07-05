/**
 * Travel advisories + sanctions pressure indicators (G14).
 * Static open-reference data — not a substitute for official government advisories.
 */

import type { Item } from "@/lib/types";
import { registerConnector } from "./framework";

/** ISO2 → advisory level 1–4 (higher = more severe). Sources: public travel advisory summaries. */
const TRAVEL_ADVISORY_LEVEL: Record<string, { level: number; label: string }> = {
  UA: { level: 4, label: "Do not travel" },
  SY: { level: 4, label: "Do not travel" },
  YE: { level: 4, label: "Do not travel" },
  AF: { level: 4, label: "Do not travel" },
  SD: { level: 4, label: "Do not travel" },
  SS: { level: 4, label: "Do not travel" },
  IR: { level: 3, label: "Reconsider travel" },
  RU: { level: 3, label: "Reconsider travel" },
  IL: { level: 3, label: "Reconsider travel" },
  LB: { level: 3, label: "Reconsider travel" },
  MM: { level: 3, label: "Reconsider travel" },
  HT: { level: 4, label: "Do not travel" },
  VE: { level: 3, label: "Reconsider travel" },
  US: { level: 1, label: "Exercise normal precautions" },
  GB: { level: 1, label: "Exercise normal precautions" },
  FR: { level: 1, label: "Exercise normal precautions" },
  IN: { level: 2, label: "Exercise increased caution" },
  CN: { level: 2, label: "Exercise increased caution" },
};

/** ISO2 on major sanctions watchlists (simplified editorial index). */
const SANCTIONS_PRESSURE: Record<string, { programs: string[]; pressure: number }> = {
  RU: { programs: ["comprehensive"], pressure: 9 },
  IR: { programs: ["comprehensive"], pressure: 9 },
  KP: { programs: ["comprehensive"], pressure: 10 },
  SY: { programs: ["comprehensive"], pressure: 8 },
  CU: { programs: ["comprehensive"], pressure: 7 },
  BY: { programs: ["sectoral"], pressure: 6 },
  VE: { programs: ["sectoral"], pressure: 6 },
  MM: { programs: ["sectoral"], pressure: 5 },
};

function advisoryItems(): Item[] {
  const now = new Date().toISOString();
  return Object.entries(TRAVEL_ADVISORY_LEVEL).map(([iso2, adv]) => ({
    id: `advisory:${iso2}`,
    module: "conflict",
    connectorId: "travel_advisories",
    title: `${iso2} travel advisory — level ${adv.level}`,
    summary: adv.label,
    source: "Argus advisory index",
    timestamp: now,
    tags: ["advisory", `level-${adv.level}`, iso2.toLowerCase()],
    entities: [{ name: iso2, type: "location" }],
    region: iso2,
    contentPolicy: "metadata_only" as const,
    extra: { iso2, level: adv.level, methodologyVersion: "advisory-index-v1" },
  }));
}

function sanctionsItems(): Item[] {
  const now = new Date().toISOString();
  return Object.entries(SANCTIONS_PRESSURE).map(([iso2, s]) => ({
    id: `sanctions:${iso2}`,
    module: "government",
    connectorId: "sanctions_pressure",
    title: `${iso2} sanctions pressure`,
    summary: `Programs: ${s.programs.join(", ")} · pressure ${s.pressure}/10`,
    source: "Argus sanctions index",
    timestamp: now,
    tags: ["sanctions", iso2.toLowerCase()],
    entities: [{ name: iso2, type: "location" }],
    region: iso2,
    contentPolicy: "metadata_only" as const,
    extra: { iso2, ...s, methodologyVersion: "sanctions-index-v1" },
  }));
}

registerConnector(
  {
    id: "travel_advisories",
    module: "conflict",
    source: "Travel advisory index",
    sourceUrl: "https://travel.state.gov",
    scheduleSeconds: 86400,
    contentPolicy: "metadata_only",
    entityTypes: ["location"],
  },
  async () => advisoryItems(),
);

registerConnector(
  {
    id: "sanctions_pressure",
    module: "government",
    source: "Sanctions pressure index",
    sourceUrl: "https://ofac.treasury.gov",
    scheduleSeconds: 86400,
    contentPolicy: "metadata_only",
    entityTypes: ["location", "organization"],
  },
  async () => sanctionsItems(),
);

export const GOVERNANCE_CONNECTOR_IDS = ["travel_advisories", "sanctions_pressure"];
