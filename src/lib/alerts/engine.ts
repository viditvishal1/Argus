// Cross-domain alert engine — evaluates rules against recent items.

import { dbEnabled } from "@/lib/db";
import type { Item } from "@/lib/types";

async function serviceClient() {
  if (!dbEnabled() || !process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

export interface AlertEvent {
  id?: number;
  rule_id?: string;
  severity: string;
  title: string;
  message?: string;
  payload: Record<string, unknown>;
  created_at?: string;
}

export async function evaluateAlerts(items: Item[]): Promise<AlertEvent[]> {
  const events: AlertEvent[] = [];

  for (const item of items) {
    if ((item.severity ?? 0) >= 7) {
      events.push({
        severity: "warning",
        title: `High severity: ${item.title}`,
        message: item.summary,
        payload: { itemId: item.id, module: item.module, severity: item.severity },
      });
    }
    if (item.module === "cyber" && item.tags.includes("kev")) {
      events.push({
        severity: "critical",
        title: `KEV alert: ${item.title}`,
        message: item.summary,
        payload: { itemId: item.id, module: "cyber" },
      });
    }
  }

  const c = await serviceClient();
  if (c && events.length > 0) {
    for (const ev of events.slice(0, 10)) {
      try {
        await c.from("alert_events").insert({
          severity: ev.severity,
          title: ev.title,
          message: ev.message ?? null,
          payload: ev.payload,
        });
      } catch { /* ignore */ }
    }
  }

  return events;
}

export async function listRecentAlerts(limit = 20): Promise<AlertEvent[]> {
  const c = await serviceClient();
  if (!c) return [];
  const { data } = await c.from("alert_events").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as AlertEvent[];
}
