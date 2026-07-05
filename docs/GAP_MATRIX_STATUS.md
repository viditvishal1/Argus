# Gap Matrix Status (vs PRD)

Last updated: 2026-07-06. Tracks closure of items from `Argus_WorldMonitor_Gap_Matrix.csv` against the current codebase.

## Closed or substantially done in this batch

| ID | Item | Status |
|----|------|--------|
| G01 | Hostname variants (6 subdomains) | Done — `variantForHostname` |
| G05 | Universal provenance on Item | Done — `enrichItemProvenance` in connector framework |
| G14 | Travel advisories + sanctions pressure | Done — `governance.ts` connectors |
| G18 | Unified preferences store | Done — local + `/api/v1/preferences` + migration `010` |
| G19 | Web Push | Partial — subscribe/VAPID routes + `push_subscriptions` table; send path pending `web-push` |
| G28 | Freshness unification | Partial — badge polls `/api/v1/freshness` |
| G30 | Smart polling | Done — `useSmartPoll` |
| G31 | Zod/OpenAPI subset | Done — `/api/v1/openapi` |
| G32 | OpenAPI export | Done — same route |
| G39 | i18n foundation | Partial — en/hi/ar catalogs + `LocaleSwitcher` |
| G40 | PWA | Partial — `manifest.json`; service worker pending |
| G43 | Valkey TCP self-host | Done — `valkey-tcp.ts` wired into `cacheGet`/`cacheSet` |
| G46 | Export service | Done — JSON/CSV/Markdown country export |

## Still open (multi-sprint)

| ID | Item | Notes |
|----|------|-------|
| G03 | 56 map layers | ~9 layers today |
| G04 | 500-feed digest | Partial RSS coverage |
| G06 | Telegram connector | Not started |
| G07 | Live media wall | Not started |
| G08–G13 | Domain depth | Partial per module |
| G15–G17 | Personalization UI | Preferences store exists; UI wiring incomplete |
| G16 | Polymarket | Not started |
| G27 | Forecasts | Not started |
| G33–G34 | MCP / CLI | Not started |
| G37 | API keys | Not started |
| G41 | Tauri desktop | Not started |
| G47 | Billing | Not started |

## Migrations

Run `010_preferences_push.sql` in Supabase for cloud preference sync and push subscription storage.
