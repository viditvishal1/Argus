# EarthOS

**An open intelligence operating system built on public data.**

EarthOS lets you search, read, filter, and cross-reference public information — news, cybersecurity feeds, aviation, maritime, space, markets, government data, infrastructure health, and startup signals — entirely inside one interface. Every module renders full readable content in-app, every list is filterable with the same universal filter bar, and every entity is a clickable node in a shared knowledge graph.

Built from [`EarthOS_PRD_v2.md`](./EarthOS_PRD_v2.md). Runs at **$0 infrastructure cost**: every data source is a free public API, most of them keyless.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — fill in keys to unlock gated features
npm run dev                  # http://localhost:3000
```

No keys are required to run. Optional keys in `.env.local`:

| Variable | Unlocks | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | AI Analyst, AI search briefings | https://aistudio.google.com/apikey (free tier) |
| `GEMINI_MODEL` | Model override (default `gemini-2.5-flash`) | — |
| `AISHUB_API_KEY` | Live AIS vessel positions | https://www.aishub.net (free membership) |

## Modules

| Module | Data sources (all free) |
|---|---|
| Global Search | Cross-module search over every connector + Google News RSS + data.gov, with AI briefing |
| Earth View | USGS earthquakes, NASA EONET (wildfires/storms/volcanoes), OpenSky flights, live ISS |
| News Intelligence | BBC, Guardian, Al Jazeera, NPR, TechCrunch, Ars Technica, The Verge, The Hindu — with in-app article extraction |
| Cyber Intelligence | NVD CVEs (7-day window), CISA Known Exploited Vulnerabilities, vendor watchlist with highlighting |
| Aviation | OpenSky Network live positions per region, FAA NAS airport delays |
| Maritime | AISHub vessels (key-gated), maritime news signals |
| Space | ISS telemetry (wheretheiss.at), Launch Library 2, NOAA SWPC space weather, CelesTrak new satellites |
| Markets | Yahoo Finance indices/equities, CoinGecko crypto — in-app price charts |
| Startup Intelligence | GitHub trending (README rendered in-app), Hacker News front page + Show HN |
| Government & Legal | Federal Register, CourtListener opinions, data.gov catalog search |
| Infrastructure Monitor | Public Statuspage APIs (GitHub, Cloudflare, Vercel, OpenAI, …) — health board + incident feed |
| City Digital Twin | Open-Meteo weather + air quality, nearby natural events, city news — composite per-city view |
| Knowledge Graph | Entities auto-extracted from every connector; force-directed explorer with neighborhood drill-down |
| AI Analyst | Retrieval-grounded Gemini Q&A with clickable inline citations; predictions always labeled |

## Architecture

```
Next.js 15 (App Router, TypeScript, Tailwind v4)
├── src/lib/connectors/   Connector framework — manifest + collector per source,
│                         per-connector isolation, retry-to-last-good-cache,
│                         content_policy enforcement (full_cache/excerpt/metadata)
├── src/lib/graph.ts      Knowledge graph store — entities + co-occurrence edges
│                         ingested from every connector run
├── src/lib/ai.ts         Gemini layer — retrieval-grounded, output cached by
│                         content hash so identical clusters aren't re-summarized
├── src/app/api/          API gateway — module feeds, search, graph, article
│                         extraction, market history, analyst
└── src/app/…             14 module UIs sharing FilterBar, ReaderPane, EntityChip,
                          MapView (MapLibre + CARTO/OSM), ForceGraph (canvas)
```

Design decisions vs. the PRD, made to keep launch at $0 with zero accounts:

- **Storage:** connector caches and the knowledge graph are in-process; bookmarks/watchlists/saved filter views live in `localStorage`. The shapes mirror the PRD's Supabase tables, so swapping in Postgres + RLS is a drop-in change behind `src/lib/saved.ts` and `src/lib/graph.ts`.
- **Rust connectors → TypeScript route handlers:** at prototype volume the polling workload doesn't need a separate Rust service; the connector manifest/lifecycle abstraction is preserved so collectors can be externalized later without touching the UI.
- **AI provider:** Gemini free tier (the PRD left the provider open).

## Legal & content policy

Every connector declares a `content_policy` (`full_cache` / `excerpt_only` / `metadata_only`) which the framework enforces before anything reaches the UI. The news reader extracts article text on demand for transient in-app display (reader-mode style, never persisted) and always keeps the "view original" link. Only public, ToS-compliant sources are used; no private data of any kind. AI-generated speculation is always labeled "AI hypothesis — not a verified forecast."

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve production build
npm run typecheck   # tsc --noEmit
```
