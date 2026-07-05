"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactGridLayout, { type Layout } from "react-grid-layout/legacy";
import type { DashboardLayout, PanelInstance } from "@/lib/panels/types";
import { getPanel } from "@/lib/panels/registry";
import { DEFAULT_INTELLIGENCE_LAYOUT, loadLayoutFromStorage, saveLayoutToStorage } from "@/lib/panels/defaults";
import { PanelContent } from "@/components/dashboard/PanelContent";
import { PanelCatalog } from "@/components/dashboard/PanelCatalog";
import "react-grid-layout/css/styles.css";

const COLS = 12;
const ROW_H = 48;
const MARGIN: [number, number] = [8, 8];

function panelsToGridLayout(panels: PanelInstance[]): Layout {
  return panels.map((inst) => {
    const def = getPanel(inst.panelKey);
    return {
      i: inst.id,
      x: inst.x,
      y: inst.y,
      w: inst.w,
      h: inst.h,
      minW: def?.minSize.w ?? 2,
      minH: def?.minSize.h ?? 2,
    };
  });
}

function applyGridLayout(panels: PanelInstance[], grid: Layout): PanelInstance[] {
  const byId = new Map(grid.map((g) => [g.i, g]));
  return panels.map((inst) => {
    const g = byId.get(inst.id);
    if (!g) return inst;
    return { ...inst, x: g.x, y: g.y, w: g.w, h: g.h };
  });
}

export function DashboardGrid({ preset = "intelligence" }: { preset?: string }) {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_INTELLIGENCE_LAYOUT);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [width, setWidth] = useState(1200);
  const [cloudSync, setCloudSync] = useState<"idle" | "synced" | "local">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, entry.contentRect.width - 16));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stored = loadLayoutFromStorage();
    if (stored) {
      setLayout(stored);
    } else if (preset === "aviation") {
      import("@/lib/panels/defaults").then((m) => setLayout(m.DEFAULT_AVIATION_LAYOUT));
    }

    fetch("/api/dashboard/layout")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.layout?.panels?.length) {
          setLayout(d.layout);
          saveLayoutToStorage(d.layout);
          setCloudSync("synced");
        } else {
          setCloudSync("local");
        }
      })
      .catch(() => setCloudSync("local"));
  }, [preset]);

  const persist = useCallback((next: DashboardLayout) => {
    setLayout(next);
    saveLayoutToStorage(next);
    setCloudSync("local");
    fetch("/api/dashboard/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then((r) => {
        if (r.ok) setCloudSync("synced");
      })
      .catch(() => {});
  }, []);

  const removePanel = (id: string) => {
    persist({ ...layout, panels: layout.panels.filter((p) => p.id !== id) });
  };

  const addPanel = (panelKey: string) => {
    const def = getPanel(panelKey);
    if (!def) return;
    const instance: PanelInstance = {
      id: `p-${panelKey}-${Date.now()}`,
      panelKey,
      x: 0,
      y: Math.max(0, ...layout.panels.map((p) => p.y + p.h), 0),
      w: def.defaultSize.w,
      h: def.defaultSize.h,
    };
    persist({ ...layout, panels: [...layout.panels, instance] });
    setCatalogOpen(false);
  };

  const gridLayout = useMemo(() => panelsToGridLayout(layout.panels), [layout.panels]);

  const onLayoutChange = (grid: Layout) => {
    const nextPanels = applyGridLayout(layout.panels, grid);
    const changed = nextPanels.some((p, i) => {
      const prev = layout.panels[i];
      return !prev || p.x !== prev.x || p.y !== prev.y || p.w !== prev.w || p.h !== prev.h;
    });
    if (changed) persist({ ...layout, panels: nextPanels });
  };

  const syncLabel =
    cloudSync === "synced" ? "Synced to account" : cloudSync === "local" ? "Local layout" : "Loading…";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
        <div>
          <h1 className="text-sm font-semibold text-ink">{layout.name} Dashboard</h1>
          <p className="text-[10px] text-ink-dim">
            Drag headers to move · resize from corners · {syncLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="rounded-md border border-line bg-panel-2 px-3 py-1.5 text-[11px] text-ink hover:bg-panel"
        >
          + Add panel
        </button>
      </div>

      <div ref={containerRef} className="argus-dashboard-grid relative min-h-0 flex-1 overflow-auto p-2">
        <ReactGridLayout
          width={width}
          layout={gridLayout}
          cols={COLS}
          rowHeight={ROW_H}
          margin={MARGIN}
          containerPadding={[0, 0]}
          draggableHandle=".panel-drag-handle"
          onLayoutChange={onLayoutChange}
          compactType="vertical"
        >
          {layout.panels.map((inst) => {
            const def = getPanel(inst.panelKey);
            if (!def) return null;
            return (
              <div key={inst.id} className="min-h-0 min-w-0">
                <PanelContent instance={inst} definition={def} onClose={() => removePanel(inst.id)} draggable />
              </div>
            );
          })}
        </ReactGridLayout>
      </div>

      {catalogOpen && (
        <PanelCatalog
          onAdd={addPanel}
          onClose={() => setCatalogOpen(false)}
          existingKeys={layout.panels.map((p) => p.panelKey)}
        />
      )}
    </div>
  );
}
