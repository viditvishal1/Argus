// Configuration loader — DB-first with in-memory seed fallback.

import { dbEnabled } from "@/lib/db";
import { getDataSourcesFromDb, getGeoLocationsFromDb, getMarketInstrumentsFromDb } from "@/lib/db/platform";
import {
  SEED_AVIATION_REGIONS,
  SEED_CITIES,
  SEED_DATA_SOURCES,
  SEED_MARKET_INSTRUMENTS,
} from "@/lib/config/seeds";
import type { DataSourceConfig, GeoLocationConfig, MarketInstrumentConfig } from "@/lib/platform/types";

const cache: {
  at: number;
  sources: DataSourceConfig[];
  cities: GeoLocationConfig[];
  instruments: MarketInstrumentConfig[];
  regions: GeoLocationConfig[];
} = { at: 0, sources: [], cities: [], instruments: [], regions: [] };

const CACHE_TTL_MS = 120_000;

function seedSources(): DataSourceConfig[] {
  return SEED_DATA_SOURCES.map((s) => ({ ...s, config_json: {} }));
}

async function loadAll(): Promise<void> {
  if (Date.now() - cache.at < CACHE_TTL_MS && cache.sources.length > 0) return;

  if (dbEnabled()) {
    try {
      const [sources, cities, instruments] = await Promise.all([
        getDataSourcesFromDb(),
        getGeoLocationsFromDb("city"),
        getMarketInstrumentsFromDb(),
      ]);
      if (sources.length > 0) {
        cache.sources = sources;
        cache.cities = cities.length > 0 ? cities : SEED_CITIES;
        cache.instruments = instruments.length > 0 ? instruments : SEED_MARKET_INSTRUMENTS;
        cache.regions = SEED_AVIATION_REGIONS;
        cache.at = Date.now();
        return;
      }
    } catch {
      /* fallback to seeds */
    }
  }

  cache.sources = seedSources();
  cache.cities = SEED_CITIES;
  cache.instruments = SEED_MARKET_INSTRUMENTS;
  cache.regions = SEED_AVIATION_REGIONS;
  cache.at = Date.now();
}

export async function getDataSources(): Promise<DataSourceConfig[]> {
  await loadAll();
  return cache.sources;
}

export async function getDataSource(id: string): Promise<DataSourceConfig | undefined> {
  await loadAll();
  return cache.sources.find((s) => s.id === id);
}

export async function getEnabledSources(): Promise<DataSourceConfig[]> {
  const sources = await getDataSources();
  return sources.filter((s) => s.enabled);
}

export async function getCityPresets(): Promise<GeoLocationConfig[]> {
  await loadAll();
  return cache.cities.filter((c) => c.enabled);
}

export async function getAviationRegions(): Promise<GeoLocationConfig[]> {
  await loadAll();
  return cache.regions.filter((r) => r.enabled);
}

export async function getMarketInstruments(): Promise<MarketInstrumentConfig[]> {
  await loadAll();
  return cache.instruments.filter((i) => i.enabled);
}

export function invalidateConfigCache(): void {
  cache.at = 0;
  cache.sources = [];
}

/** Resolve polling interval for a connector from config or manifest default. */
export async function pollingIntervalFor(sourceId: string, fallbackSeconds: number): Promise<number> {
  const src = await getDataSource(sourceId);
  return src?.polling_interval_seconds ?? fallbackSeconds;
}

export async function isSourceEnabled(sourceId: string): Promise<boolean> {
  const src = await getDataSource(sourceId);
  if (!src) return true; // unknown connector IDs remain enabled until registered in DB
  return src.enabled;
}
