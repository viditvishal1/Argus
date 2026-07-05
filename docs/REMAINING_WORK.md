# EarthOS — Remaining Work (Phase 2–4)

## Phase 2 — Search & ontology

- [ ] Supabase Auth + organisation tenant isolation
- [ ] Entity master, aliases, external identifiers (Wikidata, ICAO, IMO, tickers)
- [ ] Relationship evidence table with confidence + valid_from/to
- [ ] Replace co-occurrence-only graph with evidence-backed edges
- [ ] OpenSearch adapter (lexical + faceted + geo)
- [ ] pgvector embeddings for entities, stories, investigations
- [ ] Hybrid search pipeline (no live connector fan-out on search)
- [ ] Citation-grounded research API with sentence-level sources
- [ ] Entity 360 pages
- [ ] Admin UI for source configuration (replace seed-only)

## Phase 3 — Live intelligence

- [ ] Config-driven market catalogue (wire `market_instruments` into connectors)
- [ ] Viewport-bounded map APIs with server-side clustering
- [ ] TomTom / traffic provider adapter; rename layer only after connected
- [ ] AISStream / global AIS
- [ ] GDELT events adapter
- [ ] Wikidata entity resolution
- [ ] ClickHouse production adapter (optional)
- [ ] Historical playback
- [ ] Cross-domain alert engine

## Phase 4 — Operational intelligence

- [ ] Investigation workspaces (evidence, notes, hypotheses, timelines)
- [ ] Team collaboration + comments
- [ ] Cited report export
- [ ] Workflow actions + assignments
- [ ] Advanced anomaly detection

## Infrastructure follow-ups

- [ ] Full AWS SigV4 signing for R2 uploads (replace Phase 1 fetch stub)
- [ ] Background cron workers for ingestion (Vercel Cron or external worker)
- [ ] Supabase Management API for real DB size metrics
- [ ] Partitioned tables + automated partition drops for ephemeral data
- [ ] OpenSearch index lifecycle management
