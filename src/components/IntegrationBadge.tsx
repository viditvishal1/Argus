"use client";

import Link from "next/link";
import type { IntegrationState } from "@/lib/platform/integrations";

function toneOf(state: IntegrationState): "ok" | "warn" | "muted" {
  if (state === "fresh" || state === "ready") return "ok";
  if (state === "stale" || state === "awaiting-seed") return "warn";
  return "muted";
}

const TONE: Record<"ok" | "warn" | "muted", string> = {
  ok: "border-emerald-800/60 bg-emerald-950/30 text-emerald-300",
  warn: "border-amber-800/60 bg-amber-950/30 text-amber-300",
  muted: "border-line bg-panel-2 text-ink-dim",
};

export function IntegrationBadge({
  label,
  state,
  detail,
  href,
  count,
}: {
  label: string;
  state: IntegrationState;
  detail: string;
  href?: string;
  count?: number;
}) {
  const tone = toneOf(state);
  const body = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${TONE[tone]}`}
      title={detail}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "ok" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : "bg-ink-dim"}`} />
      {label}
      {count != null && count > 0 && <span className="mono opacity-80">{count}</span>}
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

export function integrationDetail(
  state: IntegrationState,
  configured: boolean,
  liveCount?: number,
  ageSeconds?: number | null,
): string {
  if (!configured) return "Add the server API key in Vercel environment variables";
  if (state === "awaiting-seed") return "Key detected — run live cron or wait for next seed cycle";
  if (state === "stale") return `Cached data${ageSeconds != null ? ` · ${ageSeconds}s old` : ""}`;
  if (state === "fresh" && liveCount != null) return `${liveCount} live records`;
  if (state === "ready") return "Open City Twin and select the Traffic layer";
  return state;
}
