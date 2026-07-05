# EarthOS Platform Setup (Phase 0–1)

## Local development

```bash
npm install
cp .env.example .env.local
# Minimum: leave empty for $0 mode, or add GEMINI_API_KEY / SUPABASE_* as needed
npm run dev
npm run test
npm run typecheck
```

## Supabase (recommended)

1. Create a Supabase project
2. Run **`supabase/schema.sql`** in SQL Editor
3. Run **`supabase/migrations/001_platform_foundation.sql`**
4. Run **`supabase/migrations/002_ontology_search_ops.sql`**
5. Set in `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (required for server writes in production)
5. Seed configuration:
   ```bash
   curl -X POST http://localhost:3000/api/usage \
     -H "Authorization: Bearer $EARTHOS_ADMIN_SECRET"
   ```
   Set `EARTHOS_ADMIN_SECRET` in `.env.local` first.

## Optional infrastructure

| Service | Env vars | Purpose |
|---------|----------|---------|
| Upstash Redis | `UPSTASH_REDIS_*` | Distributed cache, rate limits, queue |
| Cloudflare R2 | `CLOUDFLARE_R2_*` | Raw payload archive |
| ClickHouse | `CLICKHOUSE_*` | Phase 3 analytics (optional) |
| OpenSearch | `OPENSEARCH_*` | Phase 2 search (optional) |

Feature flags auto-enable Redis/R2 when credentials are present.

## Production (Vercel)

1. Connect GitHub repo to Vercel project
2. Add environment variables from `.env.example`
3. Use **`SUPABASE_SERVICE_KEY`** on server — do not rely on open RLS + publishable key
4. Run both SQL files in Supabase before first deploy
5. POST seed to `/api/usage` with admin secret after deploy
6. Verify `/api/status` and `/api/usage`

## Verify

- `/settings` — connector health shows `unknown` until first fetch, not fake `ok`
- `/api/config/sources` — configuration catalogue
- `/api/usage` — quota level and feature flags
- City Twin — **Streets** layer (not traffic) unless provider connected in Phase 3

## Documentation index

- `docs/PLATFORM_AUDIT.md` — codebase audit
- `docs/ARCHITECTURE.md` — target architecture
- `docs/MIGRATION_PLAN.md` — phased plan
- `docs/REMAINING_WORK.md` — Phase 2–4 backlog
