"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import { EntityChip } from "@/components/EntityChip";
import { ItemCard } from "@/components/ModuleView";
import type { Item } from "@/lib/types";

interface Entity360 {
  entity?: { canonical_name: string; object_type: string; confidence: number; wikidata_id?: string };
  aliases?: { alias: string }[];
  identifiers?: { id_type: string; id_value: string }[];
  relationships?: { relationship_type: string; confidence: number; source_entity_id: string; target_entity_id: string }[];
  documents?: { id: string; title: string; module: string; summary?: string; url?: string }[];
}

export default function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const [entityId, setEntityId] = useState<string>("");
  const [data, setData] = useState<{ persisted: Entity360 | null; graph: { items?: Item[]; entities?: unknown[] } | null } | null>(null);

  useEffect(() => {
    params.then((p) => {
      setEntityId(decodeURIComponent(p.id));
    });
  }, [params]);

  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/entity360?id=${encodeURIComponent(entityId)}`)
      .then((r) => r.json())
      .then(setData);
  }, [entityId]);

  const name = data?.persisted?.entity?.canonical_name ?? entityId.split(":").slice(1).join(":") ?? entityId;
  const type = data?.persisted?.entity?.object_type ?? entityId.split(":")[0] ?? "entity";
  const graphItems = (data?.graph?.items ?? []) as Item[];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/graph" className="mb-3 inline-flex items-center gap-1 text-xs text-ink-dim hover:text-ink">
        <ArrowLeft className="h-3 w-3" /> Back to graph
      </Link>

      <div className="mb-4 flex items-start gap-3">
        <Network className="mt-1 h-6 w-6 text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-ink">{name}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <EntityChip name={name} type={type as Item["entities"][0]["type"]} />
            {data?.persisted?.entity?.wikidata_id && (
              <span className="rounded bg-panel-2 px-2 py-0.5 text-[11px] text-ink-dim">
                Wikidata {data.persisted.entity.wikidata_id}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-sm font-medium text-ink">Identifiers & aliases</h2>
          <ul className="space-y-1 text-xs text-ink-dim">
            {(data?.persisted?.aliases ?? []).map((a) => (
              <li key={a.alias}>{a.alias}</li>
            ))}
            {(data?.persisted?.identifiers ?? []).map((i) => (
              <li key={`${i.id_type}:${i.id_value}`}><span className="mono">{i.id_type}</span> = {i.id_value}</li>
            ))}
            {!data?.persisted?.aliases?.length && !data?.persisted?.identifiers?.length && (
              <li>No persisted identifiers yet — entities sync on connector ingest when Supabase service key is set.</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="mb-2 text-sm font-medium text-ink">Relationships</h2>
          <ul className="space-y-1 text-xs text-ink-dim">
            {(data?.persisted?.relationships ?? []).slice(0, 12).map((r, i) => (
              <li key={i}>
                {r.relationship_type} · confidence {(r.confidence * 100).toFixed(0)}% · inferred
              </li>
            ))}
            {!data?.persisted?.relationships?.length && <li>No persisted relationships yet.</li>}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-line bg-panel p-4">
        <h2 className="mb-2 text-sm font-medium text-ink">Related intelligence</h2>
        <div className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
          {graphItems.map((it) => (
            <ItemCard key={it.id} item={it} selected={false} onSelect={() => {}} />
          ))}
          {(data?.persisted?.documents ?? []).map((d) => (
            <div key={d.id} className="rounded border border-line bg-panel-2 p-2 text-xs">
              <div className="font-medium text-ink">{d.title}</div>
              <div className="text-ink-dim">{d.module} · indexed</div>
            </div>
          ))}
          {!graphItems.length && !data?.persisted?.documents?.length && (
            <p className="text-xs text-ink-dim">No related items in graph or search index yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
