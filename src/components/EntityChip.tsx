"use client";

import Link from "next/link";
import { entityId } from "@/lib/graph";
import type { EntityType } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  organization: "border-sky-800 text-sky-300",
  person: "border-rose-800 text-rose-300",
  location: "border-orange-800 text-orange-300",
  event: "border-amber-800 text-amber-300",
  technology: "border-red-800 text-red-300",
  repository: "border-emerald-800 text-emerald-300",
  vessel: "border-cyan-800 text-cyan-300",
  aircraft: "border-blue-800 text-blue-300",
  satellite: "border-violet-800 text-violet-300",
  instrument: "border-green-800 text-green-300",
};

/** Consistent clickable entity tag used in every module — links into the graph. */
export function EntityChip({ name, type }: { name: string; type: EntityType }) {
  return (
    <Link
      href={`/entity/${encodeURIComponent(entityId(name, type))}`}
      className={`inline-flex max-w-[14rem] items-center gap-1 truncate rounded-full border bg-panel px-2 py-0.5 text-[11px] hover:bg-panel-2 ${TYPE_COLORS[type] ?? "border-line text-ink-dim"}`}
      title={`${name} (${type}) — open entity profile`}
    >
      <span className="truncate">{name}</span>
    </Link>
  );
}
