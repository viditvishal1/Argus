import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { stripeConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

/** Create Stripe Checkout session (G47). */
export async function POST(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  if (auth.role !== "user" && auth.role !== "admin") {
    return noCacheJson({ error: "Sign in required" }, { status: 401 });
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!stripeConfigured() || !priceId) {
    return noCacheJson({
      error: "billing_not_configured",
      note: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID",
    }, { status: 503 });
  }

  const base = process.env.ARGUS_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${base}/settings?billing=success`,
    cancel_url: `${base}/settings?billing=cancel`,
    client_reference_id: auth.id,
    "metadata[user_id]": auth.id,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return noCacheJson({ error: data.error?.message ?? "stripe_error" }, { status: 502 });
  }
  return noCacheJson({ url: data.url, sessionId: data.id });
}
