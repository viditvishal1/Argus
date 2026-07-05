// Retention policy engine — computes expiry and quota throttle levels.

import type { RetentionPolicy } from "@/lib/platform/types";

export const DEFAULT_RETENTION_HOURS: Record<string, number> = {
  aviation_positions: 12,
  traffic_observations: 3,
  marine_ais: 24,
  news_payloads: 48,
  market_ticks: 24,
  normalized: 168,
  rollups_hourly: 720,
  ontology: 876000,
};

export type QuotaLevel = "normal" | "warning" | "reduced" | "paused" | "emergency" | "critical";

const THRESHOLDS = {
  warning: Number(process.env.EARTHOS_QUOTA_WARN_PCT ?? 60),
  reduced: Number(process.env.EARTHOS_QUOTA_REDUCE_PCT ?? 75),
  paused: Number(process.env.EARTHOS_QUOTA_PAUSE_PCT ?? 85),
  emergency: Number(process.env.EARTHOS_QUOTA_EMERGENCY_PCT ?? 95),
  critical: Number(process.env.EARTHOS_QUOTA_CRITICAL_PCT ?? 98),
};

export function computeExpiresAt(retentionClass: string, retentionHours?: number): Date {
  const hours = retentionHours ?? DEFAULT_RETENTION_HOURS[retentionClass] ?? 48;
  return new Date(Date.now() + hours * 3600_000);
}

export function quotaLevelFromUsage(usagePct: number): QuotaLevel {
  if (usagePct >= THRESHOLDS.critical) return "critical";
  if (usagePct >= THRESHOLDS.emergency) return "emergency";
  if (usagePct >= THRESHOLDS.paused) return "paused";
  if (usagePct >= THRESHOLDS.reduced) return "reduced";
  if (usagePct >= THRESHOLDS.warning) return "warning";
  return "normal";
}

export function shouldCollectAtQuota(priority: number, level: QuotaLevel): boolean {
  if (level === "normal" || level === "warning") return true;
  if (level === "reduced") return priority >= 70;
  if (level === "paused") return priority >= 90;
  if (level === "emergency") return priority >= 95;
  return false; // critical — watchlists/viewports only (handled at API layer)
}

export function retentionPolicySummary(policies: RetentionPolicy[]): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_RETENTION_HOURS };
  for (const p of policies) {
    if (p.enabled) out[p.domain] = p.retention_hours;
  }
  return out;
}

/** Supabase operational targets (MB). */
export const SUPABASE_TARGET_MB = 300;
export const SUPABASE_RESERVE_MB = 150;
