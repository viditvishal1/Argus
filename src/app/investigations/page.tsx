"use client";

import { useEffect, useState } from "react";
import { FileText, FolderOpen, Pin, Plus } from "lucide-react";

interface Investigation {
  id: string;
  title: string;
  status: string;
  hypothesis?: string;
  updated_at: string;
}

interface Evidence {
  id: number;
  title: string;
  url?: string;
  excerpt?: string;
  pinned_at: string;
}

export default function InvestigationsPage() {
  const [items, setItems] = useState<Investigation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ investigation: Investigation; evidence: Evidence[]; notes: { body: string; author: string }[] } | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evUrl, setEvUrl] = useState("");
  const [dbNote, setDbNote] = useState<string | null>(null);

  const load = () => fetch("/api/investigations").then((r) => r.json()).then((d) => {
    setItems(d.investigations ?? []);
    if (d.note) setDbNote(d.note);
  });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/investigations/${selected}`).then((r) => r.json()).then(setDetail);
  }, [selected]);

  const create = async () => {
    if (!title.trim()) return;
    const res = await fetch("/api/investigations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const d = await res.json();
    if (d.error) { alert(d.error); return; }
    setTitle("");
    await load();
    if (d.investigation?.id) setSelected(d.investigation.id);
  };

  const addNote = async () => {
    if (!selected || !note.trim()) return;
    await fetch(`/api/investigations/${selected}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", body: note }),
    });
    setNote("");
    fetch(`/api/investigations/${selected}`).then((r) => r.json()).then(setDetail);
  };

  const pinEvidence = async () => {
    if (!selected || !evTitle.trim()) return;
    await fetch(`/api/investigations/${selected}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "evidence", title: evTitle, url: evUrl || undefined }),
    });
    setEvTitle("");
    setEvUrl("");
    fetch(`/api/investigations/${selected}`).then((r) => r.json()).then(setDetail);
  };

  const exportReport = async () => {
    if (!detail?.investigation) return;
    const res = await fetch("/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: detail.investigation.title,
        hypothesis: detail.investigation.hypothesis ?? detail.investigation.title,
        evidence: detail.evidence,
        notes: detail.notes,
      }),
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `investigation-${detail.investigation.id}.md`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 flex items-center gap-2 text-lg font-semibold text-ink">
        <FolderOpen className="h-5 w-5 text-accent" /> Investigation workspaces
      </h1>
      <p className="mb-4 text-xs text-ink-dim">
        Pin evidence, notes, and export cited reports. {dbNote && <span className="text-amber-400">{dbNote}</span>}
      </p>

      <div className="mb-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New investigation title"
          className="flex-1 rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink"
        />
        <button onClick={create} className="flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-sm text-white">
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-ink-dim">Cases</h2>
          <div className="flex flex-col gap-1">
            {items.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelected(inv.id)}
                className={`rounded px-2 py-1.5 text-left text-xs ${selected === inv.id ? "bg-panel-2 text-ink" : "text-ink-dim hover:bg-panel-2"}`}
              >
                <div className="font-medium">{inv.title}</div>
                <div>{inv.status} · {new Date(inv.updated_at).toLocaleDateString()}</div>
              </button>
            ))}
            {items.length === 0 && <p className="text-xs text-ink-dim">No investigations yet.</p>}
          </div>
        </div>

        <div className="md:col-span-2 rounded-lg border border-line bg-panel p-4">
          {detail ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">{detail.investigation.title}</h2>
                <button onClick={exportReport} className="flex items-center gap-1 text-xs text-accent hover:underline">
                  <FileText className="h-3 w-3" /> Export cited report
                </button>
              </div>
              {detail.investigation.hypothesis && (
                <p className="mb-3 text-xs text-ink-dim">Hypothesis: {detail.investigation.hypothesis}</p>
              )}

              <h3 className="mb-1 flex items-center gap-1 text-xs font-medium text-ink">
                <Pin className="h-3 w-3" /> Evidence
              </h3>
              <div className="mb-3 space-y-1">
                {detail.evidence.map((e) => (
                  <div key={e.id} className="rounded bg-panel-2 p-2 text-xs text-ink">
                    <div className="font-medium">{e.title}</div>
                    {e.url && <a href={e.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">{e.url}</a>}
                    <div className="text-ink-dim">Pinned {new Date(e.pinned_at).toLocaleString()}</div>
                  </div>
                ))}
                {detail.evidence.length === 0 && <p className="text-xs text-ink-dim">No evidence pinned yet.</p>}
              </div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Evidence title"
                  className="flex-1 rounded border border-line bg-panel-2 px-2 py-1 text-xs text-ink" />
                <input value={evUrl} onChange={(e) => setEvUrl(e.target.value)} placeholder="Source URL (optional)"
                  className="flex-1 rounded border border-line bg-panel-2 px-2 py-1 text-xs text-ink" />
                <button onClick={pinEvidence} className="rounded bg-panel-2 px-2 py-1 text-xs text-ink">Pin</button>
              </div>

              <h3 className="mb-1 text-xs font-medium text-ink">Notes</h3>
              <div className="mb-3 space-y-1">
                {detail.notes.map((n, i) => (
                  <div key={i} className="rounded bg-panel-2 p-2 text-xs text-ink">{n.body}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add note…"
                  className="flex-1 rounded border border-line bg-panel-2 px-2 py-1 text-xs text-ink"
                />
                <button onClick={addNote} className="rounded bg-panel-2 px-2 py-1 text-xs text-ink">Add</button>
              </div>
            </>
          ) : (
            <p className="text-xs text-ink-dim">Select or create an investigation.</p>
          )}
        </div>
      </div>
    </div>
  );
}
