"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import {
  loadPreferences, mergePreferences, syncPreferencesToCloud, loadPreferencesFromCloud,
} from "@/lib/preferences/store";
import { listCountries } from "@/lib/geo/country-index";

export function PreferencesPanel() {
  const [prefs, setPrefs] = useState(loadPreferences);
  const [syncing, setSyncing] = useState(false);
  const [syncOk, setSyncOk] = useState<boolean | null>(null);

  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  const update = (partial: Parameters<typeof mergePreferences>[0]) => {
    const next = mergePreferences(partial);
    setPrefs(next);
  };

  const toggleCountry = (iso2: string) => {
    const set = new Set(prefs.followedCountries);
    if (set.has(iso2)) set.delete(iso2);
    else set.add(iso2);
    update({ followedCountries: [...set] });
  };

  const syncUp = async () => {
    setSyncing(true);
    setSyncOk(await syncPreferencesToCloud());
    setSyncing(false);
  };

  const syncDown = async () => {
    setSyncing(true);
    const cloud = await loadPreferencesFromCloud();
    if (cloud) setPrefs(cloud);
    setSyncOk(cloud != null);
    setSyncing(false);
  };

  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="mb-1 block text-ink-dim">Cyber watchlist (comma-separated)</label>
        <input
          className="w-full rounded border border-line bg-panel-2 px-2 py-1.5 text-ink"
          value={prefs.cyberWatchlist.join(", ")}
          onChange={(e) => update({ cyberWatchlist: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>

      <div>
        <p className="mb-1 text-ink-dim">Followed countries</p>
        <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
          {listCountries().slice(0, 20).map((c) => (
            <button
              key={c.iso2}
              type="button"
              onClick={() => toggleCountry(c.iso2)}
              className={`rounded border px-1.5 py-0.5 ${prefs.followedCountries.includes(c.iso2) ? "border-accent text-accent" : "border-line text-ink-dim"}`}
            >
              {c.iso2}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-2">
        <button
          type="button"
          disabled={syncing}
          onClick={syncUp}
          className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 hover:bg-panel-2"
        >
          <Cloud className="h-3.5 w-3.5" /> Push to cloud
        </button>
        <button
          type="button"
          disabled={syncing}
          onClick={syncDown}
          className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 hover:bg-panel-2"
        >
          <CloudOff className="h-3.5 w-3.5" /> Pull from cloud
        </button>
        {syncOk != null && (
          <span className={syncOk ? "text-emerald-400" : "text-amber-400"}>
            {syncOk ? "Synced" : "Sync failed — sign in?"}
          </span>
        )}
      </div>
    </div>
  );
}
