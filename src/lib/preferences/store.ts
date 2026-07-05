/** Unified user preferences (G18) — local-first with optional cloud sync. */

export interface UserPreferences {
  version: 1;
  followedCountries: string[];
  pinnedWebcams: string[];
  cyberWatchlist: string[];
  dashboardLayoutKey?: string;
  locale: string;
  updatedAt: string;
}

const STORAGE_KEY = "argus:preferences:v1";
const DEFAULT: UserPreferences = {
  version: 1,
  followedCountries: [],
  pinnedWebcams: [],
  cyberWatchlist: [],
  locale: "en",
  updatedAt: new Date().toISOString(),
};

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as UserPreferences;
    return { ...DEFAULT, ...parsed, version: 1 };
  } catch {
    return { ...DEFAULT };
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  const next = { ...prefs, version: 1 as const, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function mergePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const merged = { ...loadPreferences(), ...partial, version: 1 as const };
  savePreferences(merged);
  return merged;
}

/** Sync to server when authenticated (best-effort). */
export async function syncPreferencesToCloud(): Promise<boolean> {
  const prefs = loadPreferences();
  try {
    const res = await fetch("/api/v1/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadPreferencesFromCloud(): Promise<UserPreferences | null> {
  try {
    const res = await fetch("/api/v1/preferences");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.preferences) return null;
    savePreferences(data.preferences as UserPreferences);
    return data.preferences as UserPreferences;
  } catch {
    return null;
  }
}
