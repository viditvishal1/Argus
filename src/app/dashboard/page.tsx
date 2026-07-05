"use client";

import { useState } from "react";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { GlobeDashboard } from "@/components/GlobeDashboard";
import { useActiveVariant } from "@/lib/variants/useVariant";

const PRESET_BY_VARIANT: Record<string, string> = {
  world: "intelligence",
  finance: "finance",
  aviation: "aviation",
  commodity: "intelligence",
  energy: "intelligence",
  tech: "intelligence",
  happy: "intelligence",
};

export default function DashboardPage() {
  const [mode, setMode] = useState<"grid" | "classic">("grid");
  const { id } = useActiveVariant();
  const preset = PRESET_BY_VARIANT[id] ?? "intelligence";

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col md:-m-6">
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-line px-3 py-1.5">
        <button
          type="button"
          onClick={() => setMode("grid")}
          className={`rounded px-2 py-0.5 text-[10px] uppercase ${mode === "grid" ? "bg-panel-2 text-accent" : "text-ink-dim"}`}
        >
          Panel grid
        </button>
        <button
          type="button"
          onClick={() => setMode("classic")}
          className={`rounded px-2 py-0.5 text-[10px] uppercase ${mode === "classic" ? "bg-panel-2 text-accent" : "text-ink-dim"}`}
        >
          Classic globe
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {mode === "grid" ? (
          <DashboardGrid preset={preset} />
        ) : (
          <GlobeDashboard variant="dashboard" fullBleed region="global" />
        )}
      </div>
    </div>
  );
}
