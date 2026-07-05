# EarthOS Migration Plan

## Phase 0 — Audit & correctness ✅

| Task | Status |
|------|--------|
| Complete codebase audit | Done — `docs/PLATFORM_AUDIT.md` |
| Hardcoded data inventory | Done — audit §1 |
| Fix connector health (`unknown` default) | Done |
| Fix misleading "Traffic" label | Done |
| SSRF hardening (`/api/article`) | Done |
| API rate limits | Done |
| Feature flags module | Done |
| Security tests | Done |

---

## Phase 1 — Durable foundation ✅ (initial)

| Task | Status |
|------|--------|
| `data_sources` configuration table | Done — migration 001 |
| Seed data from existing hardcoded values | Done — `src/lib/config/seeds.ts` |
| PostGIS extension | Done — migration 001 |
| Secure RLS policies | Done — deny anon/authenticated |
| `connector_runs` durable status | Done |
| `ingestion_records` metadata | Done |
| `feature_flags` table | Done |
| `usage_metrics` + retention policies | Done |
| R2 archive abstraction | Done — `src/lib/storage/r2.ts` |
| Redis cache abstraction | Done — `src/lib/cache/redis.ts` |
| Ingestion queue interface | Done — `src/lib/queue/ingestion.ts` |
| Retention policy engine | Done — `src/lib/storage/retention.ts` |
| Usage API + settings integration | Done |
| `.env.example` | Done |
| Config API (`/api/config/sources`) | Done |

---

## Phase 2 — Search & ontology

| Task | Priority |
|------|----------|
| Entity master + aliases + identifiers | P0 |
| Relationship evidence table | P0 |
| Replace co-occurrence-only graph edges | P0 |
| OpenSearch adapter | P0 |
| pgvector embeddings pipeline | P1 |
| Hybrid search (lexical + semantic + entity) | P0 |
| Citation-grounded research API | P0 |
| Entity 360 pages | P1 |
| Move search off live connector fan-out | P0 |
| Supabase Auth + org isolation | P0 |

---

## Phase 3 — Live intelligence

| Task | Priority |
|------|----------|
| Config-driven market instrument catalogue | P0 |
| Viewport-bounded map APIs | P0 |
| Server-side clustering | P1 |
| TomTom / traffic provider adapter | P1 |
| AISStream / global AIS | P1 |
| GDELT adapter | P1 |
| Wikidata entity resolution | P1 |
| ClickHouse production adapter | P2 |
| Historical playback | P2 |
| Alert engine | P1 |

---

## Phase 4 — Operational intelligence

| Task | Priority |
|------|----------|
| Investigation workspaces | P1 |
| Cross-domain alerts | P1 |
| Cited report export | P2 |
| Collaboration + comments | P2 |
| Workflow actions | P2 |

---

## Deployment checklist (Phase 1)

1. Run `supabase/migrations/001_platform_foundation.sql` in Supabase SQL Editor
2. Set `SUPABASE_SERVICE_KEY` (required for server writes in production)
3. Optional: `CLOUDFLARE_R2_*` for raw archive
4. Optional: `UPSTASH_REDIS_*` for distributed cache/queue
5. Run seed: `POST /api/admin/seed` (requires `EARTHOS_ADMIN_SECRET`) or SQL insert from seeds
6. Verify `/api/status` and `/api/usage`
