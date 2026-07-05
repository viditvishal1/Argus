"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";

interface KeyRow {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("default");
  const [created, setCreated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch("/api/v1/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.key) setCreated(data.key);
    load();
  };

  const revoke = async (id: string) => {
    await fetch(`/api/v1/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-line bg-panel-2 px-2 py-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name"
        />
        <button type="button" onClick={create} className="rounded border border-line px-3 py-1.5 hover:bg-panel-2">
          Create key
        </button>
      </div>

      {created && (
        <div className="rounded border border-amber-800/50 bg-amber-950/30 p-2">
          <p className="text-amber-400">Copy now — shown once:</p>
          <code className="mono mt-1 block break-all text-[11px] text-ink">{created}</code>
        </div>
      )}

      {loading ? (
        <p className="text-ink-dim">Loading keys…</p>
      ) : keys.length === 0 ? (
        <p className="text-ink-dim">No API keys — sign in to create Bearer tokens for automation.</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-2 rounded border border-line px-2 py-1.5">
              <KeyRound className="h-3.5 w-3.5 text-ink-dim" />
              <span className="text-ink">{k.name}</span>
              <code className="mono text-ink-dim">{k.key_prefix}…</code>
              <button type="button" onClick={() => revoke(k.id)} className="ml-auto text-ink-dim hover:text-critical" aria-label="Revoke">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
