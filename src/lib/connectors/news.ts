// News Intelligence connectors — config-driven RSS + Google News editions.

import { XMLParser } from "fast-xml-parser";
import type { Item } from "@/lib/types";
import { extractEntitiesFromText } from "@/lib/graph";
import { resolveNewsFeed, listNewsCountries, listNewsCategories } from "@/lib/config/news-config";
import { SEED_NEWS_FEEDS, SEED_NEWS_COUNTRIES, SEED_NEWS_CATEGORIES } from "@/lib/config/seeds";
import { fetchWithTimeout, registerConnector } from "./framework";

const parser = new XMLParser({ ignoreAttributes: false });

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"]);
  }
  return v == null ? "" : String(v);
}

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  description?: unknown;
  "content:encoded"?: unknown;
  guid?: unknown;
}

async function parseFeed(
  url: string,
  source: string,
  tags: string[],
  region?: string,
  connectorId?: string,
): Promise<Item[]> {
  const res = await fetchWithTimeout(url, { timeoutMs: 9000 });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel ?? doc?.feed;
  let raw: RssItem[] = channel?.item ?? channel?.entry ?? [];
  if (!Array.isArray(raw)) raw = [raw];
  const cid = connectorId ?? `news_${source.toLowerCase().replace(/\W+/g, "_")}`;
  return raw.slice(0, 20).map((r): Item => {
    const title = stripHtml(text(r.title));
    const link =
      typeof r.link === "object" && r.link !== null
        ? String((r.link as Record<string, unknown>)["@_href"] ?? "")
        : text(r.link);
    const desc = stripHtml(text(r.description ?? "")).slice(0, 400);
    const ts = text(r.pubDate) ? new Date(text(r.pubDate)).toISOString() : new Date().toISOString();
    return {
      id: `news:${source}:${text(r.guid) || link || title}`.slice(0, 200),
      module: "news",
      connectorId: cid,
      title,
      summary: desc,
      url: link,
      source,
      timestamp: ts,
      tags,
      region,
      entities: extractEntitiesFromText(title),
      contentPolicy: "excerpt_only",
    };
  });
}

for (const feed of SEED_NEWS_FEEDS) {
  registerConnector(
    {
      id: feed.id,
      module: "news",
      source: feed.source,
      sourceUrl: feed.url,
      scheduleSeconds: 300,
      contentPolicy: "excerpt_only",
      entityTypes: ["organization", "person", "location"],
    },
    async () => {
      const cfg = await resolveNewsFeed(feed.id);
      if (!cfg) return [];
      return parseFeed(cfg.url, cfg.source, cfg.tags, cfg.region, cfg.id);
    },
  );
}

export const NEWS_COUNTRIES = [...SEED_NEWS_COUNTRIES];
export const NEWS_CATEGORIES = [...SEED_NEWS_CATEGORIES];

function googleNewsItems(
  xml: string,
  connectorId: string,
  tags: string[],
  region?: string,
): Item[] {
  const doc = parser.parse(xml);
  let raw: RssItem[] = doc?.rss?.channel?.item ?? [];
  if (!Array.isArray(raw)) raw = [raw];
  return raw.slice(0, 20).map((r): Item => {
    const rawTitle = stripHtml(text(r.title));
    const sourceMatch = rawTitle.match(/\s-\s([^-]+)$/);
    const title = sourceMatch ? rawTitle.slice(0, sourceMatch.index) : rawTitle;
    return {
      id: `${connectorId}:${text(r.guid) || title}`.slice(0, 220),
      module: "news",
      connectorId,
      title,
      url: text(r.link),
      source: sourceMatch ? sourceMatch[1].trim() : "Google News",
      timestamp: text(r.pubDate) ? new Date(text(r.pubDate)).toISOString() : new Date().toISOString(),
      tags,
      region,
      entities: extractEntitiesFromText(title),
      contentPolicy: "metadata_only",
    };
  });
}

for (const c of SEED_NEWS_COUNTRIES) {
  const connectorId = `gnews_country_${c.code.toLowerCase()}`;
  registerConnector(
    {
      id: connectorId,
      module: "news",
      source: `Google News (${c.name})`,
      sourceUrl: "https://news.google.com",
      scheduleSeconds: 600,
      contentPolicy: "metadata_only",
      entityTypes: ["organization", "person", "location"],
    },
    async () => {
      const countries = await listNewsCountries();
      const country = countries.find((x) => x.code === c.code) ?? c;
      const url = `https://news.google.com/rss?hl=${country.hl}&gl=${country.gl}&ceid=${encodeURIComponent(country.ceid)}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 9000 });
      if (!res.ok) throw new Error(`Google News ${country.code} HTTP ${res.status}`);
      return googleNewsItems(await res.text(), connectorId, ["headlines"], country.name);
    },
  );
}

for (const cat of SEED_NEWS_CATEGORIES) {
  const connectorId = `gnews_cat_${cat.toLowerCase()}`;
  registerConnector(
    {
      id: connectorId,
      module: "news",
      source: `Google News (${cat.charAt(0) + cat.slice(1).toLowerCase()})`,
      sourceUrl: "https://news.google.com",
      scheduleSeconds: 600,
      contentPolicy: "metadata_only",
      entityTypes: ["organization", "person", "location"],
    },
    async () => {
      const categories = await listNewsCategories();
      if (!categories.includes(cat)) return [];
      const url = `https://news.google.com/rss/headlines/section/topic/${cat}?hl=en-US&gl=US&ceid=US:en`;
      const res = await fetchWithTimeout(url, { timeoutMs: 9000 });
      if (!res.ok) throw new Error(`Google News ${cat} HTTP ${res.status}`);
      return googleNewsItems(await res.text(), connectorId, [cat.toLowerCase()], "Global");
    },
  );
}

export const NEWS_CONNECTOR_IDS = [
  ...SEED_NEWS_FEEDS.map((f) => f.id),
  ...SEED_NEWS_COUNTRIES.map((c) => `gnews_country_${c.code.toLowerCase()}`),
  ...SEED_NEWS_CATEGORIES.map((c) => `gnews_cat_${c.toLowerCase()}`),
];

/** Query-based search via Google News RSS (metadata + link out). */
export async function searchGoogleNews(q: string): Promise<Item[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetchWithTimeout(url, { timeoutMs: 9000 });
  if (!res.ok) return [];
  const doc = parser.parse(await res.text());
  let raw: RssItem[] = doc?.rss?.channel?.item ?? [];
  if (!Array.isArray(raw)) raw = [raw];
  return raw.slice(0, 15).map((r): Item => {
    const rawTitle = stripHtml(text(r.title));
    const sourceMatch = rawTitle.match(/\s-\s([^-]+)$/);
    const title = sourceMatch ? rawTitle.slice(0, sourceMatch.index) : rawTitle;
    return {
      id: `gnews:${text(r.guid) || title}`.slice(0, 200),
      module: "news",
      connectorId: "google_news_search",
      title,
      url: text(r.link),
      source: sourceMatch ? sourceMatch[1].trim() : "Google News",
      timestamp: text(r.pubDate) ? new Date(text(r.pubDate)).toISOString() : new Date().toISOString(),
      tags: ["search"],
      entities: extractEntitiesFromText(title),
      contentPolicy: "metadata_only",
    };
  });
}
