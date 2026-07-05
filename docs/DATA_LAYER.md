# Live data layer (World Monitor pattern)

Argus uses a **seed/read split** so the UI never blocks on upstream APIs during page load.

## Architecture

```
Rust worker (90s)  ──┐
Python enrich (5m) ──┼──► POST /api/cron/live ──► seedLive() ──► Upstash Redis
Vercel cron (daily)──┘

Browser ──► GET /api/bootstrap ──► readLive() ──► milliseconds
```

## Keys (Redis)

| Key | TTL | Source |
|-----|-----|--------|
| `live:flights:{region}` | 75s | OpenSky / adsb.lol / Wingbits |
| `live:ships:global` | 45s | AISHub |
| `live:webcams:all` | 24h | Curated + Windy |
| `live:iss:position` | 30s | wheretheiss.at |
| `live:module:{name}` | 2–10m | Connector bundles |

## Required env (production)

1. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
2. `CRON_SECRET` — protects `/api/cron/live`
3. Optional: `WINGBITS_API_KEY`, `AISHUB_API_KEY`, `WINDY_WEBCAMS_API_KEY`

## Workers

### Rust (`workers/connector-rs`)

```bash
cd workers/connector-rs
ARGUS_APP_URL=https://argus-sooty-ten.vercel.app \
CRON_SECRET=... \
cargo run --release
```

### Python (`workers/enrichment-py`)

```bash
cd workers/enrichment-py
ARGUS_APP_URL=https://argus-sooty-ten.vercel.app \
CRON_SECRET=... \
python main.py --loop 300
```

## Manual warm (after deploy)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://argus-sooty-ten.vercel.app/api/cron/live
```

## Bootstrap endpoint

`GET /api/bootstrap` — single hydration call for Earth View / Dashboard (flights, ships, webcams, ISS, module bundles).
