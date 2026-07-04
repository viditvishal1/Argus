"use client";

import { useEffect, useState } from "react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { LoaderCircle } from "lucide-react";

export function PriceChart({
  symbol, kind, label,
}: {
  symbol: string;
  kind: "stock" | "crypto";
  label: string;
}) {
  const [data, setData] = useState<{ date: string; close: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    fetch(`/api/markets/history?symbol=${encodeURIComponent(symbol)}&kind=${kind}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.history?.length) setData(d.history);
        else setError(d.error ?? "no history available");
      })
      .catch(() => alive && setError("fetch failed"));
    return () => { alive = false; };
  }, [symbol, kind]);

  if (error) return <p className="mt-3 text-xs text-ink-dim">Chart unavailable: {error}</p>;
  if (!data) {
    return (
      <div className="mt-3 flex items-center gap-2 py-4 text-xs text-ink-dim">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading chart…
      </div>
    );
  }

  const up = data[data.length - 1].close >= data[0].close;
  const color = up ? "#34d399" : "#f87171";

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-dim">
        {label} — {kind === "crypto" ? "30 days" : "1 year"} (in-app chart)
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`g-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#8b98a5", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#232a33" }} minTickGap={40} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#8b98a5", fontSize: 10 }} tickLine={false} axisLine={false} width={60}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v < 10 ? 2 : 0))} />
            <Tooltip
              contentStyle={{ background: "#161b22", border: "1px solid #232a33", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#8b98a5" }}
              formatter={(v) => [Number(v).toLocaleString(), "close"]}
            />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={1.5} fill={`url(#g-${symbol})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
