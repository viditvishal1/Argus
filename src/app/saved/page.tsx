"use client";

// Saved — bookmarks collected from every module's reader pane.

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import type { Item } from "@/lib/types";
import { getBookmarks } from "@/lib/saved";
import { ItemCard } from "@/components/ModuleView";
import { ReaderPane } from "@/components/ReaderPane";
import { moduleById } from "@/lib/modules";

export default function SavedPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => setItems(getBookmarks()), [selected]);

  const grouped: Record<string, Item[]> = {};
  for (const it of items) (grouped[it.module] ??= []).push(it);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink">
        <Bookmark className="h-5 w-5 text-accent" /> Saved <span className="text-sm font-normal text-ink-dim">({items.length})</span>
      </h1>
      {items.length === 0 ? (
        <p className="text-sm text-ink-dim">
          Nothing saved yet — use the bookmark button in any reader pane. Bookmarks live in your
          browser (localStorage) on the $0 tier.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
          <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([mod, list]) => (
              <section key={mod}>
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  {moduleById(mod)?.name ?? mod}
                </h2>
                <div className="flex flex-col gap-1.5">
                  {list.map((it) => (
                    <ItemCard key={it.id} item={it} selected={selected?.id === it.id} onSelect={() => setSelected(it)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="max-h-[75vh]">
            {selected ? (
              <ReaderPane item={selected} onClose={() => setSelected(null)} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-dim">
                Select a saved item.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
