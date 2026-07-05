# Gap Matrix Status (vs PRD)

Last updated: 2026-07-06 (batch 2).

## Closed in batch 2

| ID | Item | Status |
|----|------|--------|
| G03 | Map layers | Partial → **16 layers** via `layer-catalog.ts` (target 56) |
| G04 | 500-feed digest | Partial — `/api/v1/digest` aggregates 11 modules up to 500 items |
| G06 | Telegram connector | Done — `telegram_channels` (needs `TELEGRAM_CHANNELS`) |
| G07 | Live media wall | Partial — `/live` page + webcam/CCTV layers on map |
| G15–G17 | Personalization UI | Partial — `PreferencesPanel` in settings |
| G16 | Polymarket | Done — `polymarket_markets` connector |
| G19 | Web Push | Done — `web-push` send + `sw.js` + `PushNotifyToggle` |
| G27 | Forecasts | Done — `open_meteo_forecast` connector |
| G33 | MCP server | Done — `npm run mcp` (`scripts/mcp-server.mjs`) |
| G34 | CLI | Done — `npm run cli` (`scripts/argus-cli.mjs`) |
| G37 | API keys | Done — migration `011` + `/api/v1/keys` + Bearer auth |
| G40 | PWA | Done — manifest + service worker |

## Closed in batch 1

| ID | Item | Status |
|----|------|--------|
| G01 | Hostname variants | Done |
| G05 | Universal provenance | Done |
| G14 | Travel advisories + sanctions | Done (geo-plotted in batch 2) |
| G18 | Unified preferences | Done |
| G28/G30 | Freshness + smart poll | Done |
| G31/G32 | OpenAPI subset | Done |
| G39 | i18n foundation | Partial — en/hi/ar |
| G43 | Valkey TCP | Done |
| G46 | Export service | Done |

## Still open

| ID | Item | Notes |
|----|------|-------|
| G03 | 56 map layers | 16/56 — need Natural Earth overlays, pipelines, etc. |
| G08–G13 | Domain depth | Incremental per module |
| G41 | Tauri desktop | Not started |
| G47 | Billing | Not started |
| G39 | Full i18n | UI strings mostly English |

## Migrations

Run `010_preferences_push.sql` and `011_api_keys.sql` in Supabase.
