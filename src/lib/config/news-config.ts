// News feed configuration — DB-first via data_sources.config_json, seed fallback.

import { getDataSource, getDataSources } from "@/lib/config/sources";
import {
  SEED_NEWS_CATEGORIES,
  SEED_NEWS_COUNTRIES,
  SEED_NEWS_FEEDS,
} from "@/lib/config/seeds";

export interface NewsFeedConfig {
  id: string;
  source: string;
  url: string;
  tags: string[];
  region?: string;
}

export interface NewsCountryConfig {
  code: string;
  name: string;
  hl: string;
  gl: string;
  ceid: string;
}

const FEED_FALLBACK = new Map<string, NewsFeedConfig>(
  SEED_NEWS_FEEDS.map((f) => [
    f.id,
    { id: f.id, source: f.source, url: f.url, tags: [...f.tags], region: f.region },
  ]),
);

const COUNTRY_FALLBACK: NewsCountryConfig[] = SEED_NEWS_COUNTRIES.map((c) => ({
  code: c.code,
  name: c.name,
  hl: c.hl,
  gl: c.gl,
  ceid: c.ceid,
}));

export async function resolveNewsFeed(connectorId: string): Promise<NewsFeedConfig | null> {
  const src = await getDataSource(connectorId);
  if (src?.config_json && typeof src.config_json.url === "string") {
    return {
      id: connectorId,
      source: src.name,
      url: String(src.config_json.url),
      tags: Array.isArray(src.config_json.tags) ? (src.config_json.tags as string[]) : ["world"],
      region: src.config_json.region ? String(src.config_json.region) : src.geographic_scope,
    };
  }
  return FEED_FALLBACK.get(connectorId) ?? null;
}

export async function listNewsFeeds(): Promise<NewsFeedConfig[]> {
  const sources = await getDataSources();
  const fromDb = sources
    .filter((s) => s.source_type === "news" && s.id.startsWith("news_") && !s.id.startsWith("news_gnews"))
    .map((s) => {
      const cfg = s.config_json ?? {};
      if (typeof cfg.url !== "string") return null;
      return {
        id: s.id,
        source: s.name,
        url: String(cfg.url),
        tags: Array.isArray(cfg.tags) ? (cfg.tags as string[]) : ["world"],
        region: cfg.region ? String(cfg.region) : s.geographic_scope,
      };
    })
    .filter(Boolean) as NewsFeedConfig[];

  if (fromDb.length > 0) return fromDb;
  return [...FEED_FALLBACK.values()] as NewsFeedConfig[];
}

export async function listNewsCountries(): Promise<NewsCountryConfig[]> {
  const sources = await getDataSources();
  const fromDb = sources
    .filter((s) => s.id.startsWith("gnews_country_"))
    .map((s) => {
      const cfg = s.config_json ?? {};
      if (!cfg.code) return null;
      return {
        code: String(cfg.code),
        name: s.name.replace(/^Google News \(/, "").replace(/\)$/, "") || String(cfg.code),
        hl: String(cfg.hl ?? "en-US"),
        gl: String(cfg.gl ?? cfg.code),
        ceid: String(cfg.ceid ?? `${cfg.code}:en`),
      };
    })
    .filter(Boolean) as NewsCountryConfig[];

  return fromDb.length > 0 ? fromDb : COUNTRY_FALLBACK;
}

export async function listNewsCategories(): Promise<string[]> {
  const sources = await getDataSources();
  const fromDb = sources
    .filter((s) => s.id.startsWith("gnews_cat_"))
    .map((s) => {
      const cat = s.config_json?.category;
      return cat ? String(cat).toUpperCase() : s.id.replace("gnews_cat_", "").toUpperCase();
    });

  return fromDb.length > 0 ? fromDb : [...SEED_NEWS_CATEGORIES];
}
