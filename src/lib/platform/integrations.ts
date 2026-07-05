import { readLiveCached } from "@/lib/live/store";
import { LIVE_SOFT_TTL } from "@/lib/live/config";
import type { Item } from "@/lib/types";

export type IntegrationState =
  | "key-required"
  | "ready"
  | "awaiting-seed"
  | "fresh"
  | "stale"
  | "unavailable";

export interface IntegrationStatus {
  id: string;
  label: string;
  configured: boolean;
  state: IntegrationState;
  liveCount?: number;
  updatedAt?: string | null;
  ageSeconds?: number | null;
  coverage: string;
  uiPath: string;
}

export function isAishubConfigured(): boolean {
  return Boolean(process.env.AISHUB_API_KEY?.trim());
}

export function isTomtomConfigured(): boolean {
  return Boolean(process.env.TOMTOM_API_KEY?.trim());
}

function shipsState(
  configured: boolean,
  count: number,
  stale: boolean,
  cold: boolean,
): IntegrationState {
  if (!configured) return "key-required";
  if (cold || count === 0) return "awaiting-seed";
  if (stale) return "stale";
  return "fresh";
}

/** Server-side snapshot for status/bootstrap — never exposes secrets. */
export async function buildIntegrationsSnapshot(): Promise<IntegrationStatus[]> {
  const aishubConfigured = isAishubConfigured();
  const tomtomConfigured = isTomtomConfigured();

  let shipsCount = 0;
  let shipsStale = true;
  let shipsCold = true;
  let shipsUpdatedAt: string | null = null;
  let shipsAge: number | null = null;

  if (aishubConfigured) {
    const ships = await readLiveCached<Item[]>("ships:global", {
      ttlSeconds: LIVE_SOFT_TTL.ships,
      source: "AISHub",
      fallback: [],
    });
    shipsCount = ships.data.length;
    shipsStale = ships.stale;
    shipsCold = ships.cold;
    shipsUpdatedAt = ships.updatedAt;
    shipsAge = ships.ageSeconds == null ? null : Math.round(ships.ageSeconds);
  }

  return [
    {
      id: "aishub",
      label: "AISHub maritime AIS",
      configured: aishubConfigured,
      state: shipsState(aishubConfigured, shipsCount, shipsStale, shipsCold),
      liveCount: shipsCount,
      updatedAt: shipsUpdatedAt,
      ageSeconds: shipsAge,
      coverage: "Multi-region bbox — Channel, Mediterranean, US East, Indian Ocean",
      uiPath: "/maritime",
    },
    {
      id: "tomtom",
      label: "TomTom traffic flow",
      configured: tomtomConfigured,
      state: tomtomConfigured ? "ready" : "key-required",
      coverage: "City Twin traffic layer — congestion-colored road segments",
      uiPath: "/city",
    },
  ];
}

export function integrationTone(state: IntegrationState): "ok" | "warn" | "muted" {
  if (state === "fresh" || state === "ready") return "ok";
  if (state === "stale" || state === "awaiting-seed") return "warn";
  return "muted";
}

export function integrationStateLabel(state: IntegrationState): string {
  switch (state) {
    case "key-required":
      return "API key required";
    case "ready":
      return "Ready — open City Twin traffic layer";
    case "awaiting-seed":
      return "Configured — awaiting live cron seed";
    case "fresh":
      return "Live";
    case "stale":
      return "Stale cache";
    case "unavailable":
      return "Unavailable";
    default:
      return state;
  }
}
