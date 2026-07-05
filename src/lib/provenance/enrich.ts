import type { Item } from "@/lib/types";

export type SourceTier = "official" | "wire" | "community" | "unknown";

const CONNECTOR_TIERS: Record<string, SourceTier> = {
  usgs_earthquakes: "official",
  nasa_eonet: "official",
  nasa_firms: "official",
  faa_notams: "official",
  faa_delays: "official",
  federal_register: "official",
  courtlistener: "official",
  reliefweb: "official",
  acled_events: "official",
  ucdp_events: "official",
  cisa_kev: "official",
  nvd_cves: "official",
  gdelt_events: "wire",
  google_news: "wire",
  maritime_news: "wire",
  aishub_vessels: "community",
  aisstream_vessels: "community",
  opensky_flights: "community",
};

export function sourceTierForConnector(connectorId: string): SourceTier {
  if (CONNECTOR_TIERS[connectorId]) return CONNECTOR_TIERS[connectorId];
  if (/news|rss|gnews/i.test(connectorId)) return "wire";
  if (/gov|faa|usgs|nasa|cisa|nvd|federal|court/i.test(connectorId)) return "official";
  return "unknown";
}

export function enrichItemProvenance(
  item: Item,
  opts: { connectorId: string; fetchedAt?: string; stale?: boolean },
): Item {
  const fetchedAt = opts.fetchedAt ?? new Date().toISOString();
  return {
    ...item,
    provenance: {
      sourceTier: item.provenance?.sourceTier ?? sourceTierForConnector(opts.connectorId),
      observedAt: item.provenance?.observedAt ?? item.timestamp,
      fetchedAt: item.provenance?.fetchedAt ?? fetchedAt,
      stale: opts.stale ?? item.provenance?.stale ?? false,
      coverageState: item.provenance?.coverageState ?? "full",
      methodologyVersion: item.provenance?.methodologyVersion ?? "provenance-v1",
    },
  };
}

export function enrichItemsProvenance(
  items: Item[],
  opts: { connectorId: string; fetchedAt?: string; stale?: boolean },
): Item[] {
  return items.map((i) => enrichItemProvenance(i, opts));
}
