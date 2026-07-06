# Gap Matrix Status (vs PRD)

Last updated: 2026-07-06 (batch 4).

## Closed in batch 4

| ID | Item | Status |
|----|------|--------|
| G03 | Map layers | **56 layers** — static geo expanded (dams, power, military, borders, rail, observatories, DCs, IXPs, rigs, mines, radar, renewables, traffic, fishing, capitals, glaciers, wetlands, undersea) + humanitarian, space weather, launches, KEV, disasters, protests |
| G39 | i18n | Partial — module loading/empty/error, filter bar, billing settings keys (en/hi/ar) |
| G47 | Billing checkout | Stripe Checkout session API + BillingPanel in settings |
| G08–G12 | Domain depth | Partial — space weather, KEV, protests, disasters layers wired from live feeds |
| G41 | Tauri desktop | CSP tightened for remote app shell |

## Closed in batch 3

| ID | Item | Status |
|----|------|--------|
| G03 | Map layers | **32 layers** — static geo + domain layers |
| G08 | Aviation depth | Partial — NOTAM geocoding + major airport hub layer |
| G10 | Health/outbreaks | Partial — WHO DON connector + outbreaks layer |
| G13 | Conflict/health | Partial — outbreaks on map |
| G39 | i18n | Partial — full nav + settings keys in en/hi/ar |
| G41 | Tauri desktop | Scaffold — `desktop/` with Tauri v2 config |
| G47 | Billing | Skeleton — migration `012`, status API, Stripe webhook stub |

## Closed in batch 2

| ID | Item |
|----|------|
| G04, G06, G07, G15–G17, G16, G19, G27, G33, G34, G37, G40 | See prior batch |

## Closed in batch 1

| ID | Item |
|----|------|
| G01, G05, G14, G18, G28, G30, G31, G32, G43, G46 | See prior batch |

## Still open

| ID | Item | Notes |
|----|------|-------|
| G39 | Full UI i18n | Reader pane, settings sections, filter labels still English |
| G41 | Tauri release | Needs signed/notarized builds + CI |
| G08–G12 | Remaining domain depth | Maritime AIS depth, vector overlays (Natural Earth), live traffic/radar feeds |

## Migrations

Run through `012_billing.sql` in Supabase. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` for billing.
