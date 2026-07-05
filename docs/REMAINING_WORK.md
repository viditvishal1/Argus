# Argus — Remaining work

## Phase completion

See **`docs/PHASE_STATUS.md`** for the full audit matrix. Phases 0–10 are **MVP-complete** in code; production still needs manual config below.

## Completed platform pass (Phases 0–4 legacy doc)

### Phase 0
- [x] Audit documentation
- [x] Connector health `unknown` default + circuit breaker
- [x] Streets/traffic label accuracy
- [x] SSRF hardening on `/api/article`
- [x] Rate limits on search, graph, entity, analyst, article, research
- [x] Base schema RLS migration (`003_secure_base_rls.sql`)

### Phase 1
- [x] Config tables + expanded seed
- [x] News connectors config-driven
- [x] R2 archive, ingestion queue, Vercel crons
- [x] Admin PATCH `/api/config/sources`

### Phase 2
- [x] Hybrid search, graph persistence, entity resolution, embeddings

### Phase 3
- [x] City traffic layer, watchlists API, viewport clustering

### Phase 4
- [x] Investigation evidence pinning, cited report export

## Audit extensions (Phases 5–10)

- [x] Phase 5 — variants, command palette, methodology
- [x] Phase 6 — Vitest + Playwright + CI E2E + load smoke
- [x] Phase 7 — deployment runbook, staging parity, Docker healthchecks
- [x] Phase 8 — security gate, restore drill, npm audit in CI
- [x] Phase 9 — AISStream + OpenSearch ingest pipeline
- [x] Phase 10 — org membership + saved-search tenancy (`009`)

## Still requires production configuration

1. Run migrations **`001`–`009`** in Supabase SQL Editor (`node scripts/migrate-check.mjs`)
2. Link `SUPABASE_SERVICE_KEY` + `NEXT_PUBLIC_SUPABASE_*` to the Argus Vercel project
3. Set `CRON_SECRET`, Redis (`UPSTASH_*` or `KV_*`), `ARGUS_APP_URL`; **redeploy**
4. Enable Supabase Cron → `GET /api/cron/live` (see `supabase/scripts/setup_argus_live_cron.sql`)
5. Post-deploy: `ARGUS_APP_URL=https://… npm run staging-parity`
6. Optional: `AISHUB_API_KEY` / `AISSTREAM_API_KEY`, `GEMINI_API_KEY`, `OPENSEARCH_*`, `TOMTOM_API_KEY`, R2

## Deferred (not blocking release)

- ClickHouse production deployment + position writers
- Historical playback UI
- Real-time investigation collaboration
- Full i18n (EN/HI/AR RTL) and TV mode
- Visual regression and accessibility CI scans
- Web Push alert delivery
