import { dbEnabled } from "@/lib/db";

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  schedule: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const memory = new Map<string, SavedSearch>();

async function serviceClient() {
  if (!dbEnabled() || !process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

function rowToSearch(row: Record<string, unknown>): SavedSearch {
  return {
    id: String(row.id),
    name: String(row.name),
    query: String(row.query),
    filters: (row.filters_json as Record<string, unknown>) ?? {},
    schedule: String(row.schedule ?? "manual"),
    enabled: Boolean(row.enabled),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function listSavedSearches(enabledOnly = false): Promise<SavedSearch[]> {
  const c = await serviceClient();
  if (!c) {
    const all = [...memory.values()];
    return enabledOnly ? all.filter((s) => s.enabled) : all;
  }
  let q = c.from("saved_searches").select("*").order("updated_at", { ascending: false }).limit(50);
  if (enabledOnly) q = q.eq("enabled", true);
  const { data } = await q;
  return (data ?? []).map((r) => rowToSearch(r as Record<string, unknown>));
}

export async function upsertSavedSearch(
  input: Pick<SavedSearch, "id" | "name" | "query"> & Partial<SavedSearch>,
): Promise<SavedSearch> {
  const now = new Date().toISOString();
  const full: SavedSearch = {
    id: input.id,
    name: input.name,
    query: input.query,
    filters: input.filters ?? {},
    schedule: input.schedule ?? "manual",
    enabled: input.enabled !== false,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  const c = await serviceClient();
  if (!c) {
    memory.set(full.id, full);
    return full;
  }
  const { data, error } = await c.from("saved_searches").upsert({
    id: full.id,
    name: full.name,
    query: full.query,
    filters_json: full.filters,
    schedule: full.schedule,
    enabled: full.enabled,
    updated_at: now,
  }).select().single();
  if (error) throw error;
  return rowToSearch(data as Record<string, unknown>);
}

export async function deleteSavedSearch(id: string): Promise<void> {
  memory.delete(id);
  const c = await serviceClient();
  if (c) await c.from("saved_searches").delete().eq("id", id);
}
