"use client";

// Client-side persistence for bookmarks, watchlists and saved filter presets.
// Stored in localStorage for the $0 tier; the shapes mirror the Supabase
// tables described in the PRD so swapping in RLS-backed storage is a
// drop-in change behind these functions.

import type { Item } from "@/lib/types";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---- bookmarks ----

export function getBookmarks(): Item[] {
  return read<Item[]>("earthos.bookmarks", []);
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().some((b) => b.id === id);
}

export function toggleBookmark(item: Item): boolean {
  const all = getBookmarks();
  const idx = all.findIndex((b) => b.id === item.id);
  if (idx >= 0) {
    all.splice(idx, 1);
    write("earthos.bookmarks", all);
    return false;
  }
  write("earthos.bookmarks", [{ ...item, body: undefined }, ...all].slice(0, 200));
  return true;
}

// ---- cyber watchlist (vendor / product keywords) ----

export function getWatchlist(): string[] {
  return read<string[]>("earthos.watchlist.cyber", []);
}

export function setWatchlist(words: string[]) {
  write("earthos.watchlist.cyber", words.map((w) => w.trim()).filter(Boolean));
}

// ---- saved filter presets, keyed per module ----

export interface FilterPreset {
  name: string;
  params: string; // URL query string encoding the filter state
}

export function getPresets(module: string): FilterPreset[] {
  return read<FilterPreset[]>(`earthos.presets.${module}`, []);
}

export function savePreset(module: string, preset: FilterPreset) {
  const all = getPresets(module).filter((p) => p.name !== preset.name);
  write(`earthos.presets.${module}`, [preset, ...all].slice(0, 20));
}

export function deletePreset(module: string, name: string) {
  write(`earthos.presets.${module}`, getPresets(module).filter((p) => p.name !== name));
}
