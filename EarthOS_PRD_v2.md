# EarthOS — Final Product PRD & Architectural Blueprint
### An Open Intelligence Operating System Built on Public Data

**Version:** 2.0 (Final Product Spec — not an MVP)
**Status:** Draft for engineering review
**Owner:** Product / Founder

> **One honest note before you build from this:** this document specs the *full, final* product and is written so every module can run on free tiers and open-source infrastructure at low volume. "$0 cost" holds at prototype/low-user scale. Once you have real traffic, three things *will* cost money no matter how the architecture is designed: AI API calls, exceeding free-tier rate limits on paid-adjacent APIs (flights, ships, stocks), and storage/bandwidth beyond free quotas. The blueprint below minimizes and delays all three for as long as possible — it does not make them disappear. That single caveat aside, everything below is designed for $0 at launch.

---

## Table of Contents

1. Executive Summary
2. Product Philosophy for the Final Product (vs. MVP)
3. Users & Personas
4. Complete Scope — All Modules, Final Product
5. Architectural Blueprint (Full System Diagram)
6. Tech Stack — Mapped to Each Use Case
7. In-App Content Rendering ("Never Leave EarthOS")
8. Universal Filter System
9. Data Layer & Storage Strategy
10. Connector Framework
11. Full Public API / Data Source Catalog
12. Knowledge Graph — Full Design
13. AI Layer & Orchestration
14. Search Architecture
15. Information Architecture & Navigation
16. UI/UX Design System
17. Module-by-Module Functional Requirements
18. User Flows
19. Non-Functional Requirements
20. Security, Privacy & Legal Boundaries
21. Zero-Cost Infrastructure Blueprint
22. Build Sequence (Full Product, Not Phased as MVP)
23. Risks & Open Questions
24. Appendix

---

## 1. Executive Summary

EarthOS is a full-scale, multi-domain intelligence platform that lets a user search, read, filter, and cross-reference public information — news, government data, cybersecurity feeds, aviation, maritime, space, markets, infrastructure, and startup signals — **entirely inside one interface**, without bouncing out to the original source for basic reading. Every module surfaces full readable content in-app (article text, PDF viewers, embedded data tables, image viewers), every list in the product is filterable, and every entity (company, person, place, event, CVE, repository) is a clickable node in a shared knowledge graph.

This document specs the complete, final product — every module described in earlier ideation, not a stripped-down first release — with an architecture designed to run at $0 infrastructure cost using free tiers and self-hosted open-source components.

---

## 2. Product Philosophy for the Final Product (vs. MVP)

This spec intentionally builds every module described in the original vision rather than a narrow slice:

- Global Search
- Earth View (map with all layers)
- News Intelligence (full in-app reader)
- Cyber Intelligence
- Aviation
- Maritime
- Space
- Markets & Crypto
- Startup / GitHub Intelligence
- Government & Legal Data
- Infrastructure Monitor
- City Digital Twin
- Knowledge Graph (cross-module)
- AI Analyst (natural-language cross-domain queries)

Because this is the full product, the architecture below is built module-by-module with the assumption that all of them ship — the connector framework, knowledge graph, and filter system are designed generically enough on day one to support all fourteen without rework.

---

## 3. Users & Personas

**Priya — Independent Analyst.** Needs cross-domain situational awareness, saved searches, alerting, and the ability to *read full articles and reports without leaving the platform*.

**Devesh — Security Researcher.** Needs CVE/CERT tracking, GitHub signal correlation, and in-app rendering of security advisories (often PDFs).

**Alex — Power User / Explorer.** Wants the "mission control" Earth View with every live layer enabled, and enjoys clicking through the knowledge graph for its own sake.

**Sam — Founder/Market Watcher.** Tracks funding news, GitHub releases, patents, and market data, cross-linked through the graph.

---

## 4. Complete Scope — All Modules, Final Product

This is the full-product scope; nothing below is deferred to "later phases" — it is what ships.

| # | Module | Core Function |
|---|---|---|
| 1 | Global Search | Cross-module search + AI briefing |
| 2 | Earth View | Map with togglable live layers |
| 3 | News Intelligence | In-app article reader, clustering, AI summaries |
| 4 | Cyber Intelligence | CVE/CERT tracking, in-app advisory viewer |
| 5 | Aviation | Flight tracking, airport status, NOTAMs |
| 6 | Maritime | Ship tracking, port status |
| 7 | Space | Satellites, launches, ISS, solar activity |
| 8 | Markets | Stocks, crypto, in-app charting |
| 9 | Startup Intelligence | GitHub, Product Hunt, funding, patents |
| 10 | Government & Legal | Open data portals, court records |
| 11 | Infrastructure Monitor | Power, internet health, ports, data centers |
| 12 | City Digital Twin | Per-city composite view of relevant layers |
| 13 | Knowledge Graph | Entity/relationship explorer, shared across all modules |
| 14 | AI Analyst | Natural-language cross-module Q&A, sourced |

---

## 5. Architectural Blueprint (Full System Diagram)

```
                                   ┌────────────────────────────┐
                                   │        EarthOS Client        │
                                   │  Next.js + TypeScript + Tailwind │
                                   │  In-app readers, filters, map   │
                                   └───────────────┬──────────────┘
                                                    │ GraphQL / REST
                                   ┌───────────────▼──────────────┐
                                   │        API Gateway (Node)     │
                                   │   Auth, rate limiting, routing │
                                   └───┬───────┬───────┬──────────┘
              ┌───────────────────────┘       │       └───────────────────────┐
   ┌──────────▼──────────┐        ┌───────────▼───────────┐        ┌──────────▼──────────┐
   │  Connector Services   │        │   AI Orchestrator       │        │  Knowledge Graph      │
   │  (Rust — high-throughput│      │   (Python — FastAPI)    │        │  Service (Python/TS)  │
   │  polling & parsing)   │        │   Summarize / extract   │        │  Entity + edge queries │
   └──────────┬───────────┘        └───────────┬───────────┘        └──────────┬───────────┘
              │                                 │                              │
   ┌──────────▼─────────────────────────────────▼──────────────────────────────▼───────────┐
   │                          Event Bus (Redis Streams / NATS — self-hosted, free)            │
   └──────────┬─────────────────────────────────┬──────────────────────────────┬───────────┘
              │                                 │                              │
   ┌──────────▼──────────┐        ┌─────────────▼─────────────┐     ┌──────────▼──────────┐
   │ Postgres (Supabase)   │        │  Object Storage (R2/Supabase)│    │ Search Index (Typesense│
   │ users, metadata, graph│        │  articles cache, PDFs, images│    │ or Postgres FTS + pgvector)│
   └───────────────────────┘        └───────────────────────────┘     └───────────────────────┘
```

**Why this shape:** connectors (Rust) do the high-frequency, high-volume work of polling dozens of free-tier APIs and parsing responses — a workload where Rust's low memory footprint and concurrency model matter because you're running many polling jobs on a free-tier compute box. The AI orchestrator and knowledge graph logic (Python) do the heavier, less frequent, more complex reasoning work — a workload where Python's ecosystem (NLP libraries, AI SDKs) matters more than raw throughput. The client and API gateway (TypeScript) glue it together and serve the UI.

---

## 6. Tech Stack — Mapped to Each Use Case

| Use Case | Language/Framework | Why |
|---|---|---|
| Frontend UI | **TypeScript + Next.js + Tailwind CSS + shadcn/ui** | Server-rendered for fast first paint, component-driven, free hosting tiers (Vercel) |
| Design system components | **shadcn/ui + Radix primitives** | Accessible, unstyled primitives styled via Tailwind — no framework lock-in |
| API Gateway | **TypeScript (Node.js, Fastify or Hono)** | Lightweight, fast, same language as frontend reduces context-switching |
| High-frequency connectors (polling flights, ships, earthquakes, markets) | **Rust (Tokio async runtime)** | Low memory/CPU footprint lets many polling jobs run concurrently on a single free-tier VM |
| Content parsing (RSS, HTML article extraction, PDF text extraction) | **Rust** (using crates like `scraper`, `readability`) or **Python** (`readability-lxml`, `pdfplumber`) for anything needing heavier NLP pre-processing | Rust for throughput-sensitive parsing; Python where a mature parsing library only exists there |
| AI orchestration (summarization, entity extraction, RAG) | **Python (FastAPI) + LangChain/LlamaIndex or a lightweight custom orchestration layer** | Best ecosystem for AI SDKs, embeddings, and NLP |
| Knowledge graph service | **Python (FastAPI) or TypeScript**, backed by **Postgres adjacency tables** (final product may migrate to **Memgraph**, which has a free community edition) | Graph queries at this data volume don't yet need a dedicated graph DB license cost |
| Search | **Typesense** (self-hosted, open-source, free) or **Postgres full-text + pgvector** for semantic search | Both are free to self-host |
| Auth & primary DB | **Supabase (Postgres + Auth + Row-Level Security)** | Free tier covers MVP-to-mid-scale usage entirely |
| Object storage | **Cloudflare R2** (free egress, generous free tier) or **Supabase Storage** | Free tier sufficient for cached articles/PDFs/images |
| Event bus | **Redis Streams** (via free-tier Upstash) or **NATS** (self-hosted, free, open-source) | Both are $0 to run at low volume |
| Background job scheduling | **Rust workers** for connector polling; **Python (Celery or APScheduler)** for AI/graph batch jobs | Matches runtime to workload type |
| Maps | **MapLibre GL JS + OpenStreetMap tiles** | Fully free, no API-key vendor lock-in |
| Charts | **Recharts / Apache ECharts** (TypeScript) | Free, well-supported in React |
| Monitoring | **Grafana + Prometheus** (self-hosted, free) | Standard open-source observability stack |
| CI/CD | **GitHub Actions** (free tier for public/small private repos) | $0 for reasonable usage |
| Hosting | **Vercel (frontend)** free tier, **Fly.io / Railway** free tier for backend/worker containers | Both offer free tiers sufficient for early-to-mid traffic |

> Note on "pretext": this isn't a recognized framework name, so I've substituted **Next.js + Tailwind + shadcn/ui**, which is the closest modern, production-grade equivalent for what you likely meant (a component-driven, utility-CSS frontend stack). If you had a specific tool in mind, tell me and I'll swap it in.

---

## 7. In-App Content Rendering ("Never Leave EarthOS")

This is a first-class requirement across the whole product, not just News: **every module renders its content natively inside EarthOS.** The user should rarely need to click through to an external site for basic reading.

| Content type | In-app rendering approach |
|---|---|
| News articles | Server-side fetch + `readability`-style extraction → clean in-app reader view (title, byline, body text, images) with a "View original" link kept only as a secondary option, not the primary action |
| PDFs (CERT advisories, government reports, court filings) | In-app PDF viewer component (e.g., `react-pdf` / `pdf.js`) rendered inline, no download required to read |
| Images/satellite imagery | In-app image viewer with zoom/pan |
| Structured data (CVEs, market tickers, flight/ship records) | Rendered as in-app structured cards/tables, not links to the source dashboard |
| GitHub repos | In-app summary card (stars, recent commits, releases) pulled via API, with README rendered in-app |
| Court judgments | In-app text viewer with extracted key facts (parties, date, outcome) surfaced above the full text |

**Caching/legal note:** article/report caching for in-app display should respect each source's terms of use — some sources permit full-text caching, others only permit short excerpts with a link out. The connector metadata for each source should include a `content_policy` field (`full_cache`, `excerpt_only`, `metadata_only`) that the renderer checks before deciding how much content to display in-app versus linking out.

---

## 8. Universal Filter System

Every list, feed, and map layer in the product uses the same filter component, so the experience is consistent across all fourteen modules.

**Standard filter dimensions available everywhere applicable:**
- **Date/time range** (last hour / 24h / 7d / 30d / custom range)
- **Source** (multi-select — e.g., which news outlets, which CVE feed, which exchange)
- **Region/Geography** (country, region, or map-drawn bounding box)
- **Entity type** (organization, person, location, event, technology)
- **Severity/importance** (where applicable — e.g., CVE severity, earthquake magnitude, news relevance score)
- **Tags/category** (module-specific taxonomy, e.g., "ransomware," "wildfire," "product launch")
- **Saved filter presets** (user can save a filter combination as a named view, e.g., "My Cyber Watchlist – Critical Only")

**Filter component behavior:**
- Filters persist per module per user (stored in Supabase against the user's profile).
- Filters are combinable (AND logic across dimensions, OR logic within a multi-select dimension).
- Every filtered view has a shareable URL (filter state encoded in query params) so a saved search can be bookmarked or shared.
- A global "Reset filters" action is always visible when any filter is active.

---

## 9. Data Layer & Storage Strategy

| Data type | Storage | Retention | Notes |
|---|---|---|---|
| Article metadata | Postgres | Indefinite | Title, URL, source, timestamp, tags, entities |
| Article full text (where policy allows) | Object storage, compressed | 30-90 days rolling cache | Re-fetch on expiry if user revisits |
| Live telemetry (flights, ships, markets, weather) | In-memory cache (Redis) | Minutes to hours | Never persisted long-term; always re-fetched live |
| CVEs/advisories | Postgres + object storage for PDFs | Indefinite (small, high-value dataset) | |
| User data (bookmarks, watchlists, saved filters, saved searches) | Postgres, Row-Level Security | Indefinite, user-owned | |
| Knowledge graph (entities/edges) | Postgres adjacency tables → Memgraph at scale | Indefinite | This is the core long-term asset |
| AI-generated summaries | Object storage, keyed by content hash | 14-30 days unless user saves it | Avoids repeated AI calls for the same content |

---

## 10. Connector Framework

Every source implements the same lifecycle so the 14th module and the 140th connector cost the same amount of engineering effort to add:

```
Source → Collector (Rust) → Normalizer → Content-Policy Check
       → Event Bus → [Storage | Knowledge Graph | Cache] → API → Client
```

**Connector manifest (per source):**
```yaml
id: usgs_earthquakes
runtime: rust
schedule: "*/5 * * * *"     # every 5 minutes
rate_limit: none
content_policy: full_cache
entity_types: [location, event]
output_schema: earthquake_v1
```

Each connector runs in isolation with its own retry/backoff and circuit breaker, so one failing free-tier API (e.g., a flight-tracking rate limit) never takes down news or earthquakes.

---

## 11. Full Public API / Data Source Catalog

| Domain | Sources | Cost |
|---|---|---|
| News | RSS feeds, GNews, NewsAPI, Google News RSS | Free tier |
| Government/legal | data.gov, data.gov.in, EU Open Data Portal, CourtListener, eCourts (India) | Free |
| Earthquakes | USGS | Free |
| Volcanoes | Smithsonian Global Volcanism Program | Free |
| Wildfires | NASA FIRMS, ESA datasets | Free |
| Weather | Open-Meteo, OpenWeather, national met agencies | Free tier |
| Aviation | OpenSky Network, AviationStack | Free tier (rate-limited) |
| Maritime | AISHub | Free tier (limited) |
| Space | CelesTrak, NASA, ESA, community launch APIs | Free |
| Cybersecurity | NVD, CVE feeds, CISA, CERT advisories | Free |
| GitHub/startups | GitHub API, Product Hunt API, Hacker News API | Free within rate limits |
| Patents | Google Patents, USPTO, EPO | Free |
| WHOIS/domains | RDAP endpoints | Free |
| Crypto | CoinGecko, CoinCap | Free tier |
| Stocks | Alpha Vantage, Finnhub | Free tier (rate-limited) |
| Air quality | OpenAQ, WAQI | Free tier |
| Internet health | Cloudflare Radar, RIPE Atlas | Free |

---

## 12. Knowledge Graph — Full Design

**Entity types (final product):** Organization, Person, Location, Event, Technology/CVE, Repository, Patent, Court Case, Vessel, Aircraft, Satellite, Financial Instrument.

**Edge types:** `mentions`, `located_in`, `affiliated_with`, `affected_by`, `references`, `owns`, `filed_by`, `operates`, `impacts`.

**Storage:** Postgres adjacency tables (`entities`, `edges`, `edge_metadata`) for the full product's initial scale; migrate to **Memgraph** (free community edition) once multi-hop traversal queries (3+ hops) become common and slow in relational form.

**Entity extraction pipeline:**
```
Ingested content (Rust connector) → Python NLP service (spaCy / transformer NER)
  → candidate entities → dedupe against existing graph (fuzzy match + embedding similarity)
  → create/update entity + edges → publish graph-update event
```

**Graph explorer UI:** every entity page shows a force-directed mini-graph (rendered client-side, e.g., via `react-force-graph` or D3) of its 1-2 hop neighborhood, clickable to re-center the graph on any connected entity.

---

## 13. AI Layer & Orchestration

**Responsibilities:**
- Cluster and summarize related items per topic, always citing sourced items
- Extract entities/relationships for the knowledge graph
- Power the AI Analyst module: natural-language queries answered via retrieval over the graph + search index, not free-form generation

**Architecture:**
```
Python FastAPI service
  ├── /summarize   → RAG over recent items in a topic cluster
  ├── /extract     → NER + relation extraction for graph ingestion
  └── /ask         → Natural-language Q&A, retrieval-grounded, cites sources
```

**Cost control:** cache AI outputs by content hash so the same cluster of articles is never summarized twice; batch entity extraction jobs rather than running per-article in real time where latency allows.

**Labeling rule:** any AI-generated forecast, hypothesis, or "predicted development" text is visually and textually marked (e.g., an "AI hypothesis — not a verified forecast" badge) and never presented as fact.

---

## 14. Search Architecture

- **Full-text:** Postgres full-text search (`tsvector`) for exact/keyword queries — free, no extra infra.
- **Semantic:** `pgvector` extension on the same Postgres instance for embedding-based similarity search — avoids standing up a separate vector database.
- **Scale option:** self-hosted Typesense if/when query volume or latency requirements exceed what Postgres comfortably handles — still $0 in licensing, only a compute cost.

**On quantum search:** not included in this architecture. Grover's algorithm needs fault-tolerant quantum hardware that doesn't exist for consumer applications, and its speedup model (unstructured search over an oracle) doesn't match what an indexed full-text/semantic search engine needs to do. The search layer sits behind a clean internal interface so the backing engine could theoretically be swapped later, but no roadmap item depends on quantum hardware existing.

---

## 15. Information Architecture & Navigation

```
EarthOS
├── Global Search (persistent top bar, all modules)
├── Earth View (map, all live layers togglable)
├── Modules (left nav)
│    ├── News Intelligence        [in-app reader]
│    ├── Cyber Intelligence       [in-app advisory viewer]
│    ├── Aviation
│    ├── Maritime
│    ├── Space
│    ├── Markets
│    ├── Startup Intelligence
│    ├── Government & Legal
│    ├── Infrastructure Monitor
│    └── City Digital Twin
├── Knowledge Graph Explorer
├── AI Analyst (chat-style cross-module Q&A)
├── Saved (bookmarks, watchlists, saved searches/filters)
└── Settings (account, alert preferences, connector status)
```

Every module page follows the same layout contract: **Filter bar (top) → Feed/List (left or main) → Detail/Reader pane (right or modal) → Linked entities (bottom of detail pane).**

---

## 16. UI/UX Design System

**Visual direction:** dark-mode-first "command center" aesthetic, data-dense but legible — analyst tooling, not a marketing site.

**Frontend stack for the design system:** Next.js + TypeScript + Tailwind CSS + shadcn/ui (Radix-based accessible primitives) + Lucide icons.

**Core reusable components:**
- Universal Filter Bar (Section 8)
- In-App Reader Pane (article/PDF/structured-data viewer, Section 7)
- Entity Chip (consistent clickable tag linking to the graph, used in every module)
- Map Layer Panel (togglable layers, shared by Earth View and City Digital Twin)
- Timeline Component (event clustering, News and Cyber modules)
- Force-Directed Graph Mini-View (entity pages)
- Alert/Notification Center (badge + dropdown, global)
- Saved View Manager (list of saved filters/searches per module)

**Color system:** dark base, high-contrast text; one accent color per module family for quick visual scanning (cyber = red/amber, disaster/weather = orange, markets = green, aviation/maritime = blue, space = violet).

**Accessibility:** WCAG AA minimum contrast; all live-updating regions use `aria-live`; full keyboard navigation for filters and the reader pane.

---

## 17. Module-by-Module Functional Requirements

### 17.1 Global Search
- Cross-module search with grouped results and a single AI briefing at the top.
- Every result entity is clickable into the knowledge graph.
- Filters (Section 8) apply globally to search results.

### 17.2 Earth View
- Togglable layers: earthquakes, weather, wildfires, flights, ships, air quality, volcanoes.
- Click any marker for an in-app detail panel (no external redirect).
- Filter by date range, region (map-drawn), and severity/magnitude.

### 17.3 News Intelligence
- In-app reader for full article text (subject to `content_policy` per source).
- Topic clustering with AI summary, all summaries cite source articles.
- Filters: source, region, date, entity, sentiment/tag.

### 17.4 Cyber Intelligence
- CVE/CERT feed with in-app PDF/advisory viewer.
- User-defined watchlists (vendor/software) with alerting on new matches.
- Filters: severity (CVSS score), vendor, date, exploit-available flag.

### 17.5 Aviation
- Live flight positions (OpenSky), airport delay status, NOTAMs.
- In-app aircraft detail card (no redirect to third-party tracker).
- Filters: airline, route, airport, status (delayed/on-time/cancelled).

### 17.6 Maritime
- Ship positions (AIS feed), port status.
- In-app vessel detail card.
- Filters: vessel type, flag, region, port.

### 17.7 Space
- ISS position, satellite catalog (CelesTrak), launch schedule, solar activity.
- Filters: launch provider, date range, orbit type.

### 17.8 Markets
- In-app charting for stocks/crypto (no redirect to exchange site).
- Filters: ticker, exchange, date range, asset class.

### 17.9 Startup Intelligence
- GitHub repo tracking (stars, releases, commits) with in-app README rendering.
- Product Hunt / Hacker News launch tracking.
- Filters: category, funding stage (where available), date, language/tech stack.

### 17.10 Government & Legal
- Open data portal search, court judgment viewer (in-app text extraction).
- Filters: jurisdiction, date, case type, agency/department.

### 17.11 Infrastructure Monitor
- Internet health (Cloudflare Radar, RIPE Atlas), power grid status where public data exists.
- Filters: region, infrastructure type, severity of disruption.

### 17.12 City Digital Twin
- Per-city composite dashboard pulling relevant layers (weather, air quality, traffic where available, news, alerts) into one view.
- Filters: city selector, layer toggle, date range.

### 17.13 Knowledge Graph Explorer
- Full graph search and multi-hop traversal UI.
- Filters: entity type, edge type, date range of relationship formation.

### 17.14 AI Analyst
- Natural-language query box; answers are retrieval-grounded and cite sources, with any predictive content clearly labeled.
- Filters: scope the query to specific modules/date ranges before asking.

---

## 18. User Flows

**Flow A — First-time search, read in-app:**
```
Land on EarthOS → Search a term → Grouped results with AI briefing
→ Click a news result → Full article opens in in-app reader (not a new tab)
→ Click an entity mentioned in the article → Entity page with graph view
→ Bookmark the article or save the search
```

**Flow B — Cyber watchlist with in-app advisory reading:**
```
Cyber module → Add vendor to watchlist → New CVE matches → Alert fires
→ Click alert → CVE detail opens with linked CERT PDF rendered in-app
→ Filter advisory list by severity to see only Critical
```

**Flow C — Earth View exploration with filters:**
```
Open Earth View → Toggle Earthquakes + Wildfires layers
→ Draw a bounding box filter over a region → Map narrows to that region
→ Click a marker → In-app detail panel → Cross-linked news about that event
```

**Flow D — AI Analyst cross-module query:**
```
Open AI Analyst → Ask "what cyber incidents this week affected shipping companies?"
→ System retrieves from Cyber + Maritime + News modules via the knowledge graph
→ Answer rendered with inline citations → Each citation clickable to its in-app source
```

**Flow E — Returning daily user:**
```
Log in → Dashboard shows new alerts across all watchlists since last visit
→ AI-summarized "what changed" briefing → Drill into any item via in-app reader
```

---

## 19. Non-Functional Requirements

- **Performance:** cached/metadata search results return in under 2 seconds; live-fetch modules show a loading state and resolve within 5 seconds under normal conditions.
- **Availability:** per-connector isolation — one source failing degrades only that module.
- **Rate-limit compliance:** every connector respects its source's published limits; backoff, not silent retry storms.
- **In-app content freshness:** every reader/detail view shows a "last fetched" timestamp.
- **Consistency:** the filter bar, entity chip, and reader pane components are shared code, not reimplemented per module, to guarantee UI consistency.
- **Localization-ready:** V1 UI text is English-only but not hardcoded in a way that blocks future i18n.

---

## 20. Security, Privacy & Legal Boundaries

- Only publicly available, ToS-compliant data sources are used; no scraping that violates a source's terms.
- No private data collection of any kind (no CCTV, private social accounts, phone/email lookups, telecom data, classified systems) — a permanent boundary, not a phase-2 feature.
- Row-Level Security in Supabase ensures users only access their own bookmarks/watchlists/saved filters.
- All third-party API keys are server-side only.
- In-app content rendering respects each source's `content_policy` (full cache vs. excerpt-only vs. metadata-only) to stay within usage terms.
- AI-generated predictive content is always labeled as such.

---

## 21. Zero-Cost Infrastructure Blueprint

| Component | Free-tier resource | Realistic ceiling before cost appears |
|---|---|---|
| Frontend hosting | Vercel free tier | Moderate traffic; upgrade needed at high concurrent users |
| Backend/worker hosting | Fly.io / Railway free tier | Multiple small containers fit comfortably at low-to-mid traffic |
| Database + Auth | Supabase free tier | ~500MB DB is generous for metadata-only storage (Section 9) |
| Object storage | Cloudflare R2 free tier | Free egress makes this the cheapest long-term option for cached articles/PDFs |
| Event bus | Self-hosted NATS (free) or Upstash Redis free tier | NATS avoids any tier ceiling since it's self-hosted |
| Search | Self-hosted Typesense or Postgres FTS/pgvector | Both $0 in licensing; only compute cost if self-hosting |
| AI | Pay-as-you-go API usage | **The one line item that scales with real usage and cannot be made permanently free** — caching (Section 13) is the main lever to control this |
| Monitoring | Self-hosted Grafana + Prometheus | Free indefinitely, only needs a small VM |

---

## 22. Build Sequence (Full Product, Not Phased as MVP)

Since this spec is for the complete final product rather than a staged MVP, the recommended build order is by **dependency**, not by "cut scope" — every module above ships, built in an order that lets later modules reuse infrastructure built for earlier ones:

1. **Foundation:** Auth, Postgres schema, API gateway, connector framework skeleton, universal filter component, in-app reader component.
2. **Core data modules:** News, Earthquakes/Weather/Wildfires (Earth View), Cyber Intelligence — these validate the connector framework and in-app rendering end to end.
3. **Knowledge graph v1:** entity extraction pipeline wired to the three modules above.
4. **Remaining domain modules:** Aviation, Maritime, Space, Markets, Startup Intelligence, Government & Legal, Infrastructure Monitor — each is now a matter of writing a new connector manifest, not new architecture.
5. **City Digital Twin:** composite view, built once enough underlying modules exist to populate it meaningfully.
6. **Knowledge Graph Explorer UI + AI Analyst:** built last since they depend on a graph with enough entities/edges across modules to be useful.

---

## 23. Risks & Open Questions

- **Free-tier fragility on aviation/maritime/markets:** these sources have the tightest free-tier rate limits; the connector framework's backoff/circuit-breaker design is what keeps them from breaking the rest of the platform.
- **Content-policy compliance per source:** each connector's `content_policy` field needs a real legal/ToS review, not just a technical assumption, before shipping in-app full-text caching for that source.
- **Entity resolution accuracy:** AI-assisted NER will misclassify or duplicate entities at scale; a review/merge mechanism is needed before the graph is fully trusted.
- **AI cost as the platform's only real unavoidable expense:** caching strategy (Section 13) is the primary lever; monitor this closely as usage grows.
- **Open question:** long-term monetization model (ads-free per Anthropic's own policy stance if AI features are Claude-powered, subscription, or usage-based API tiers) — affects how aggressively AI features can be exposed to free users.

---

## 24. Appendix

- **Naming candidates:** EarthOS, Atlas, Helios, Sentinel, Argus, Polaris, Horizon.
- **Design inspiration referenced conceptually only** (no branding/trademarks/UI reused): Bloomberg Terminal, Palantir Foundry, Google Earth, Perplexity.
- **Explicitly rejected technical approaches:** quantum-assisted search (no viable consumer hardware); storing full raw content for every source regardless of ToS (legal risk); a single monolithic codebase without the connector abstraction (breaks past ~10 sources).

---

*End of document.*
