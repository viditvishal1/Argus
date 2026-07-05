import type { AlertEvent } from "@/lib/alerts/engine";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id?: string;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

async function serviceClient() {
  if (!process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

/** Send Web Push notifications for an alert event (G19). */
export async function sendPushForAlert(event: AlertEvent): Promise<number> {
  if (!pushConfigured()) return 0;

  const db = await serviceClient();
  if (!db) return 0;

  const { data } = await db.from("push_subscriptions").select("endpoint,p256dh,auth");
  const subs = (data ?? []) as PushSubscriptionRow[];
  if (!subs.length) return 0;

  const webpush = await import("web-push");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:ops@argus.local",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const payload = JSON.stringify({
    title: event.title,
    body: event.message ?? event.severity,
    url: "/settings",
    severity: event.severity,
    id: event.id,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }),
  );
  return sent;
}
