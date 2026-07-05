# EarthOS Platform Audit

**Date:** 2026-07-05  
**Scope:** Full codebase review before Palantir/Bloomberg/Perplexity/Maps transformation  
**Current version:** 2.0.0 (Next.js 15 prototype)

---

## Executive summary

EarthOS is a working $0-tier intelligence dashboard with **44 TypeScript connectors**, MapLibre maps, in-process graph, and optional Supabase persistence. It is **not yet** a durable global intelligence platform. State is process-local, configuration is hardcoded, RLS is fully open, APIs are unauthenticated, and search invokes live connectors on every query.

This audit inventories gaps and drives Phase 0–1 remediation.

---

## 1. Hardcoded data inventory

| Domain | Location | What's hardcoded |
|--------|----------|------------------|
| News RSS | `src/lib/connectors/news.ts:12-21` | 8 publishers |
| News countries | `news.ts:111-119` | US, IN, GB, AU, CA, SG, AE |
| News categories | `news.ts:121-123` | 7 Google News categories |
| Markets | `src/lib/connectors/markets.ts:66-80` | 13 Yahoo symbols |
| Aviation probes | `src/lib/connectors/aviation.ts:23-108` | ~80 hub points, 8 region bboxes |
| NOTAM airports | `src/lib/connectors/notams.ts:7-11` | 24 ICAO codes |
| Maritime bbox | `src/lib/connectors/maritime.ts:30` | English Channel only |
| Infrastructure | `src/lib/connectors/infrastructure.ts:9-18` | 8 Statuspage hosts |
| City presets | `src/app/city/page.tsx:13-26` | 12 cities |
| Aviation UI regions | `src/app/aviation/page.tsx:12-21` | Map centers per region |
| Space TLE groups | `src/app/api/space/tle/route.ts:9` | 6 CelesTrak groups |
| Earth map layers | `src/app/earth/page.tsx:13-20` | Layer toggles + Europe flights |
| Modules | `src/lib/modules.ts:13-27` | 13 module registry |
| Connector registry | `src/lib/connectors/index.ts:46-57` | Static `MODULE_CONNECTORS` map |

**UI duplicates:** News page re-declares countries/categories separate from connector config.

---

## 2. Mock / placeholder / static data

| Item | Status |
|------|--------|
| Dedicated mock datasets | **None** — all connectors hit live APIs |
| Demo mode | **None** |
| Heuristic NER (`graph.ts`) | Not mock — produces inferred entities from regex |
| ISS synthesized item (`earth/page.tsx`) | Built from live `/api/iss`, not static |
| localStorage bookmarks | Client-only persistence |

**Missing:** `.env.example` (README references it but file was absent until Phase 1).

---

## 3. In-memory / non-durable state

| Store | File | Risk |
|-------|------|------|
| Connector cache + status | `framework.ts` via `globalThis.__earthos` | Lost on cold start; wrong health across instances |
| Knowledge graph | `graph.ts` | No persistence; co-occurrence only |
| Article cache | `article-cache.ts` | 7-day in-process; Supabase optional overlay |
| AI responses | `ai.ts` | 30-min in-process |
| Geocode / flights / TLE | API routes | Per-process Maps |
| Event bus | `events/bus.ts` | In-process handlers; Redis optional |

---

## 4. Connectors claiming global coverage with limited results

| Connector | Claim | Reality |
|-----------|-------|---------|
| `aishub_vessels` | Maritime AIS | English Channel bbox unless key + global API |
| `opensky_states` | Aviation | Region-bounded; global uses probe grid (slow, incomplete) |
| `maritime_news` | Global | Google News keyword only |
| Earth flights layer | Live flights | Europe bbox only in UI |
| Knowledge graph | Cross-module intelligence | Heuristic NER + co-occurrence, not ontology |
| City "Traffic" layer | Traffic intelligence | OSM streets only; no live traffic tiles |
| Neuro-symbolic graph | AI reasoning | Gemini over 1-hop neighborhood |

---

## 5. APIs triggered on every user query

| Route | Behavior | Cost / risk |
|-------|----------|-------------|
| `/api/search` | Runs **all** connector IDs (4s budget each) + Google News + data.gov | High egress; DoS vector |
| `/api/graph` | All connectors + graph snapshot | Same |
| `/api/entity` | All connectors + neighborhood | Same |
| `/api/analyst` | Scoped connectors + Gemini | LLM cost abuse |
| `/api/graph/reason` | Partial connectors + Gemini | LLM cost abuse |
| `/api/modules/[module]` | All module connectors per page load | Moderate |

**Not yet:** Query indexed stored data first; background ingestion workers.

---

## 6. Database persistence gaps

| Data | Persisted? | Store |
|------|------------|-------|
| Article cache | Partial | Supabase `article_cache` |
| Ingested items | Partial | Supabase `ingested_items` (100/batch) |
| Events | Partial | Supabase `event_log` |
| Connector status | **No** | In-process only |
| Source configuration | **No** | Hardcoded |
| Entity graph | **No** | In-process only |
| Raw API payloads | **No** | Not archived |
| Market instruments | **No** | Hardcoded symbols |
| User data | **No** | localStorage only |

---

## 7. Connector health reporting issues

| Issue | Location |
|-------|----------|
| Never-run connectors report `ok: true` | `framework.ts:168-175` |
| No `unknown` / `stale` / `degraded` states | `ConnectorStatus` type |
| Key-gated shown as error only after run attempt | Inconsistent |
| No circuit breaker or failure counters | — |
| No freshness SLA per source | — |

---

## 8. Missing rate limits, quotas, pagination

- No API rate limiting on any route
- No per-IP or per-key quotas
- No connector daily request/byte budgets
- Search returns unbounded merge then slices to 12/module
- Map endpoints return full regional flight sets to client
- No pagination on `/api/modules/[module]`

---

## 9. Security risks

| Risk | Severity | Location |
|------|----------|----------|
| Open RLS (`using (true)`) | **Critical** | `supabase/schema.sql:48-62` |
| No authentication | **High** | All routes |
| Search/graph fan-out DoS | **High** | `/api/search`, `/api/graph` |
| Gemini cost abuse | **High** | `/api/analyst`, `/api/graph/reason` |
| SSRF partial mitigation | **Medium** | `/api/article` — redirect follow, no metadata IP block |
| Ingest shared secret only | **Medium** | `/api/ingest` — no replay/size limits |
| Publishable key server writes | **Medium** | `db/index.ts` with open RLS |
| Committed Supabase project ref | **Low** | `supabase/config.toml` |

---

## 10. Misleading labels / overstated features

| UI label | Actual behavior |
|----------|-----------------|
| "Streets & Traffic" (City Twin) | OSM streets; no traffic provider |
| "Neuro-symbolic AI" (Graph) | Gemini + 1-hop co-occurrence graph |
| "Global" aviation region | Probe sampling, not complete coverage |
| Connector `ok: true` before first fetch | Implies healthy without verification |
| "Knowledge Graph" | In-memory co-occurrence, not ontology |

---

## 11. Expensive polling / duplicate writes

- Aviation global grid: 80+ adsb.lol probes per cold fetch
- Search runs all connectors even for ticker-specific queries
- Rust worker + TS connector both poll USGS earthquakes
- `persistIngestedItems`: individual upserts, max 100, no batching
- No R2 archival — repeated raw fetches

---

## 12. Phase 0 remediation (implemented)

- [x] Connector health `unknown` until first verified run
- [x] Rename misleading "Traffic" → "Streets" in City Twin
- [x] SSRF hardening on `/api/article` (redirect validation, metadata block)
- [x] Rate limiting on expensive API routes
- [x] Feature flags module
- [x] Audit documentation

---

## 13. Phase 1 foundation (implemented)

- [x] `data_sources` configuration table + seed migration
- [x] Durable `connector_runs` / ingestion metadata tables
- [x] PostGIS extension + location column pattern
- [x] Secure RLS (deny anon/authenticated; service role server-side)
- [x] R2 archive abstraction
- [x] Redis cache abstraction
- [x] Ingestion queue interface
- [x] Retention policy definitions
- [x] Usage tracking API
- [x] `.env.example` template
- [x] Security + rate-limit unit tests

---

## 14. Remaining work (Phase 2–4)

See `docs/MIGRATION_PLAN.md` and `docs/REMAINING_WORK.md`.
