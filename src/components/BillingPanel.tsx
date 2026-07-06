"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";

interface BillingState {
  plan: string;
  status: string;
  configured: boolean;
  currentPeriodEnd?: string | null;
}

export function BillingPanel() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v1/billing/status")
      .then((r) => r.json())
      .then(setBilling)
      .catch(() => setBilling(null));
  }, []);

  const checkout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? data.note ?? "Checkout unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-ink-dim" />
        <span className="text-ink">
          Plan: <strong>{billing?.plan ?? "free"}</strong>
          {billing?.status && billing.status !== "inactive" && (
            <span className="ml-2 text-emerald-400">({billing.status})</span>
          )}
        </span>
      </div>
      {billing?.currentPeriodEnd && (
        <p className="text-ink-dim">Renews {new Date(billing.currentPeriodEnd).toLocaleDateString()}</p>
      )}
      {!billing?.configured && (
        <p className="text-amber-400">Stripe not configured on server (STRIPE_SECRET_KEY).</p>
      )}
      <button
        type="button"
        disabled={busy || !billing?.configured || billing?.status === "active"}
        onClick={checkout}
        className="rounded border border-line bg-panel-2 px-3 py-1.5 text-ink hover:bg-panel disabled:opacity-50"
      >
        {billing?.status === "active" ? "Pro active" : "Upgrade to Pro"}
      </button>
    </div>
  );
}
