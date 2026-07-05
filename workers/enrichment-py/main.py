#!/usr/bin/env python3
"""Argus enrichment batch service — scores, correlates, and seeds Redis-backed outputs.

Run as a scheduled job (Railway cron, GitHub Actions, or local):
  python main.py --once
  python main.py --loop 300

Requires: ARGUS_APP_URL, CRON_SECRET (optional — triggers live seed after enrichment)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def http_get(url: str, headers: dict | None = None, timeout: float = 30) -> dict:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def http_post(url: str, headers: dict | None = None, timeout: float = 120) -> dict:
    req = urllib.request.Request(url, method="POST", headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def compute_activity_scores(bootstrap: dict) -> list[dict]:
    """Cross-domain activity scoring — lightweight World Monitor-style convergence."""
    scores: list[dict] = []
    modules = bootstrap.get("modules") or {}
    flights = bootstrap.get("flights") or {}
    flight_count = len(flights.get("global") or [])
    ship_count = len((bootstrap.get("ships") or {}).get("items") or [])

    for mod, payload in modules.items():
        items = payload.get("items") or []
        high = [i for i in items if (i.get("severity") or 0) >= 6]
        if high:
            scores.append({
                "domain": mod,
                "highSeverityCount": len(high),
                "topTitle": high[0].get("title", ""),
                "computedAt": datetime.now(timezone.utc).isoformat(),
            })

    scores.append({
        "domain": "live-transport",
        "flightCount": flight_count,
        "shipCount": ship_count,
        "computedAt": datetime.now(timezone.utc).isoformat(),
    })
    return scores


def run_once() -> None:
    app = env("ARGUS_APP_URL", env("EARTHOS_APP_URL", "http://localhost:3000")).rstrip("/")
    secret = env("CRON_SECRET", env("ARGUS_ADMIN_SECRET", env("EARTHOS_ADMIN_SECRET")))

    print(f"[{datetime.now(timezone.utc).isoformat()}] enrichment run — {app}")

    try:
        bootstrap = http_get(f"{app}/api/bootstrap", timeout=15)
    except urllib.error.URLError as e:
        print(f"bootstrap fetch failed: {e}", file=sys.stderr)
        return

    scores = compute_activity_scores(bootstrap)
    print(f"activity scores: {json.dumps(scores, indent=2)[:500]}")

    if secret:
        try:
            result = http_post(
                f"{app}/api/cron/live",
                headers={"Authorization": f"Bearer {secret}"},
                timeout=120,
            )
            print(f"live seed triggered: {result.get('ok')} flights={result.get('flights')}")
        except urllib.error.URLError as e:
            print(f"live seed failed: {e}", file=sys.stderr)
    else:
        print("CRON_SECRET not set — skipped live seed trigger")


def main() -> None:
    parser = argparse.ArgumentParser(description="Argus enrichment batch service")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--loop", type=int, default=0, help="Loop interval seconds")
    args = parser.parse_args()

    if args.once or not args.loop:
        run_once()
        return

    while True:
        run_once()
        time.sleep(args.loop)


if __name__ == "__main__":
    main()
