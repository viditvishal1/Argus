# EarthOS — Remaining Work (post Phase 2–4 foundation)

## Completed in Phase 2–4 foundation deploy

- [x] Entity master, aliases, identifiers, relationships tables
- [x] Search documents (PostgreSQL FTS fallback)
- [x] pgvector table scaffold
- [x] Hybrid search (indexed first, limited live fallback)
- [x] Citation-grounded research API (`/api/research`)
- [x] Entity 360 pages (`/entity/[id]`)
- [x] OpenSearch adapter (optional, env-gated)
- [x] Admin source config view (`/admin/sources`)
- [x] Config-driven market instruments
- [x] GDELT global events connector
- [x] Viewport map API with clustering
- [x] TomTom traffic adapter (key-gated)
- [x] ClickHouse adapter stub
- [x] Alert engine + `/api/alerts`
- [x] Investigation workspaces + cited report export

## Still outstanding

### Auth & multi-tenancy
- [ ] Supabase Auth integration
- [ ] Organisation-scoped RLS for authenticated users
- [ ] Admin write UI for source enable/disable

### Search & ontology depth
- [ ] OpenSearch index pipeline (auto-index on ingest)
- [ ] pgvector embedding generation (Gemini / local model)
- [ ] Wikidata auto-enrichment on entity create
- [ ] Confirmed vs inferred relationship UI
- [ ] Full entity resolution (ICAO, IMO, tickers)

### Live intelligence depth
- [ ] AISStream global AIS
- [ ] Historical playback UI
- [ ] ClickHouse production deployment + writers
- [ ] Traffic layer UI when TomTom connected
- [ ] Watchlist-driven map tracking

### Operational intelligence depth
- [ ] Real-time collaboration / comments sync
- [ ] Workflow assignments
- [ ] Advanced cross-domain alert rules UI
- [ ] Anomaly detection models

### Infrastructure
- [ ] Vercel Cron ingestion workers
- [ ] Partitioned ephemeral tables + auto-drop
- [ ] R2 SigV4 upload SDK
- [ ] Supabase Management API size metrics
