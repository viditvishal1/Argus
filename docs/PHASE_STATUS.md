# World Monitor transformation — phase status

Last verified: 2026-07-06 · branch `main` · commit `6f8b1aa`

## Summary

| Range | Status | Notes |
|-------|--------|-------|
| Audit Phases 0–7 | **MVP complete** | Full audit scope is 12–18 weeks; shipped slices cover release criteria |
| Extension Phases 8–10 | **Complete** | Security gate, deployment tooling, AISStream, OpenSearch ingest, org tenancy |
| Post-roadmap backlog | **Deferred** | ClickHouse writers, historical playback, real-time collab, full i18n/TV |

**Release gate:** `npm run release-gate` (preflight + typecheck + unit + build + E2E)

---

## Audit roadmap (Phases 0–7)

### Phase 0 — Preparation ✅
- `.env.example`, `docs/ARCHITECTURE.md`, `docs/MIGRATION_PLAN.md`, CI, preflight

### Phase 1 — Stabilization ✅ (MVP)
- API guards, rate limits, SSRF, security headers (CSP report-only + HSTS in prod builds)
- Investigations/watchlists/alerts protected routes

### Phase 2 — Architecture & data ✅ (MVP)
- Supabase Auth + RLS (`008_user_auth_rls.sql`)
- Provider registry, observations, ingest queue, Valkey/Upstash cache
- `/api/v1` surface, hybrid search, entity resolution

### Phase 3 — Core PRD MVP ✅ (MVP)
- World variant, CII v1, findings, country brief, 19 panels, dashboard grid
- Freshness badge, strategic risk, export paths

### Phase 4 — Advanced intelligence ✅ (MVP)
- Signal detectors (convergence, chokepoint, aviation, cascade, cyber KEV)
- Alert engine + SSE notifications, digest export, rule builder, saved searches
- *Deferred:* Web Push, full CII v8 parity, local-first AI chain

### Phase 5 — UX & variants ✅ (MVP)
- 6 variants enabled, command palette, methodology page, nav filtering
- *Deferred:* i18n (EN/HI/AR RTL), TV mode, dedicated mobile E2E matrix

### Phase 6 — Testing & QA ✅ (MVP)
- 124 unit tests, Playwright E2E (smoke, API, findings, investigations)
- Permission matrix tests, `npm audit --audit-level=high` in CI
- `scripts/load-smoke.mjs` for concurrent endpoint checks
- *Deferred:* visual regression, a11y scanner, live Supabase RLS integration suite

### Phase 7 — Deployment ✅
- `docs/DEPLOYMENT.md`, Docker healthchecks, `staging-parity`, `migrate-check`, `restore-drill`
- Live cron via Supabase (see `supabase/scripts/setup_argus_live_cron.sql`)

---

## Extension phases (8–10)

### Phase 8 — Security hardening ✅
- CSP report-only, HSTS, `docs/SECURITY.md`, restore drill, CI audit

### Phase 9 — Data platform ✅
- AISStream WebSocket fallback (`AISSTREAM_API_KEY`)
- OpenSearch dual-write on ingest when `OPENSEARCH_URL` set

### Phase 10 — Org tenancy ✅
- `009_org_members.sql` — membership + org-scoped saved searches

---

## Production checklist (manual)

These are **configuration**, not code gaps:

1. Run migrations `001`–`009` in Supabase SQL Editor (order in `docs/DEPLOYMENT.md`)
2. Set Vercel env: `CRON_SECRET`, Redis (`UPSTASH_*` or `KV_*`), Supabase keys, `ARGUS_APP_URL`
3. Link `SUPABASE_SERVICE_KEY` to the Argus Vercel project
4. Configure Supabase Cron for `/api/cron/live` (every 2 min)
5. Post-deploy: `ARGUS_APP_URL=... npm run staging-parity`
6. Optional keys: `AISHUB_API_KEY` / `AISSTREAM_API_KEY`, `GEMINI_API_KEY`, `OPENSEARCH_*`

---

## Deferred (post-100% / future sprints)

| Item | Rationale |
|------|-----------|
| ClickHouse position writers | Optional analytics; adapter stub exists |
| Historical playback UI | Requires time-series store + UI |
| Real-time investigation collaboration | WebSocket presence layer |
| Full i18n + RTL + TV mode | Phase 5 extended scope |
| Visual regression + a11y CI | Phase 6 extended scope |
| Web Push alert delivery | Phase 4 extended scope |
