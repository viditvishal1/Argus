"use client";

// In-App Reader Pane (PRD §7) — renders full readable content natively:
// extracted article text, CVE/advisory bodies, README markdown, market charts.
// "View original" is always present but secondary. Shows a "last fetched"
// timestamp per the freshness NFR.

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, LoaderCircle } from "lucide-react";
import type { Item } from "@/lib/types";
import { EntityChip } from "@/components/EntityChip";
import { Markdown } from "@/components/Markdown";
import { isBookmarked, toggleBookmark } from "@/lib/saved";
import { PriceChart } from "@/components/PriceChart";

function SeverityBadge({ item }: { item: Item }) {
  if (!item.severityLabel) return null;
  const sev = item.severity ?? 0;
  const color =
    sev >= 8 ? "bg-red-950 text-red-300 border-red-800"
    : sev >= 6 ? "bg-orange-950 text-orange-300 border-orange-800"
    : sev >= 4 ? "bg-amber-950 text-amber-300 border-amber-800"
    : "bg-panel text-ink-dim border-line";
  return (
    <span className={`mono rounded border px-1.5 py-0.5 text-[11px] ${color}`}>
      {item.severityLabel}
    </span>
  );
}

function ArticleText({ url }: { url: string }) {
  const [state, setState] = useState<{ loading: boolean; paragraphs?: string[]; error?: string }>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fetch(`/api/article?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, paragraphs: d.paragraphs, error: d.error }))
      .catch(() => alive && setState({ loading: false, error: "extraction failed" }));
    return () => { alive = false; };
  }, [url]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-ink-dim">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Extracting article text…
      </div>
    );
  }
  if (state.error || !state.paragraphs?.length) {
    return (
      <p className="py-3 text-xs text-ink-dim">
        Full text couldn’t be extracted from this source ({state.error ?? "no text"}). Use the
        original link above.
      </p>
    );
  }
  return (
    <div className="prose-earthos mt-2">
      {state.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

function RepoReadme({ repo }: { repo: string }) {
  const [state, setState] = useState<{ loading: boolean; md?: string; error?: string }>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fetch(`/api/readme?repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, md: d.markdown, error: d.error }))
      .catch(() => alive && setState({ loading: false, error: "fetch failed" }));
    return () => { alive = false; };
  }, [repo]);
  if (state.loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-ink-dim">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading README…
      </div>
    );
  }
  if (!state.md) return <p className="py-3 text-xs text-ink-dim">README unavailable ({state.error}).</p>;
  return <div className="mt-2 border-t border-line pt-3"><Markdown text={state.md} /></div>;
}

export function ReaderPane({ item, onClose }: { item: Item; onClose?: () => void }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(isBookmarked(item.id)), [item.id]);

  const isNews = (item.module === "news" || item.tags.includes("maritime-news")) && item.contentPolicy !== "metadata_only" && item.url;
  const repo = item.extra?.repo as string | undefined;
  const chartSymbol = item.extra?.symbol as string | undefined;
  const assetClass = item.extra?.assetClass as string | undefined;

  return (
    <article className="flex h-full flex-col overflow-y-auto rounded-lg border border-line bg-panel p-4" aria-live="polite">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-dim">
          <span className="mono uppercase tracking-wide">{item.source}</span>
          <SeverityBadge item={item} />
          <time dateTime={item.timestamp}>{new Date(item.timestamp).toUTCString()}</time>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setSaved(toggleBookmark(item))}
            className="rounded-md border border-line p-1.5 text-ink-dim hover:text-accent"
            aria-label={saved ? "Remove bookmark" : "Bookmark"}
            title={saved ? "Remove bookmark" : "Bookmark"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="rounded-md border border-line px-2 py-1 text-xs text-ink-dim hover:text-ink" aria-label="Close reader">
              ✕
            </button>
          )}
        </div>
      </div>

      <h2 className="mb-1 text-lg font-semibold leading-snug text-ink">{item.title}</h2>
      {item.summary && item.summary !== item.title && (
        <p className="text-sm leading-relaxed text-[#b8c2cc]">{item.summary}</p>
      )}

      {item.body && (
        <pre className="mt-3 whitespace-pre-wrap border-t border-line pt-3 font-sans text-sm leading-relaxed text-[#b8c2cc]">
          {item.body}
        </pre>
      )}

      {isNews && item.url && <ArticleText url={item.url} />}
      {repo && <RepoReadme repo={repo} />}
      {chartSymbol && assetClass && (
        <PriceChart
          symbol={assetClass === "crypto" ? item.id.replace("crypto:", "") : chartSymbol}
          kind={assetClass === "crypto" ? "crypto" : "stock"}
          label={item.title}
        />
      )}

      {Array.isArray(item.extra?.references) && (item.extra.references as string[]).length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-dim">References</div>
          {(item.extra.references as string[]).map((r) => (
            <a key={r} href={r} target="_blank" rel="noreferrer" className="block truncate text-xs text-accent hover:underline">{r}</a>
          ))}
        </div>
      )}

      {item.entities.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-dim">Linked entities</div>
          <div className="flex flex-wrap gap-1.5">
            {item.entities.map((e) => <EntityChip key={`${e.type}:${e.name}`} name={e.name} type={e.type} />)}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-ink-dim">
        <span>Last fetched {new Date(item.timestamp).toLocaleString()}</span>
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-accent">
            View original <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
