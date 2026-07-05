import { createHash, randomBytes } from "crypto";
import type { ApiPrincipal } from "@/lib/auth/api-guard";

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `argus_${randomBytes(24).toString("hex")}`;
  return { raw, prefix: raw.slice(0, 12), hash: hashKey(raw) };
}

async function serviceClient() {
  if (!process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

export async function verifyUserApiKey(token: string): Promise<ApiPrincipal | null> {
  if (!token.startsWith("argus_")) return null;
  const db = await serviceClient();
  if (!db) return null;

  const hash = hashKey(token);
  const { data } = await db
    .from("api_keys")
    .select("id,user_id,name")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!data) return null;

  void db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { id: String(data.user_id), role: "user" };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const db = await serviceClient();
  if (!db) return [];
  const { data } = await db
    .from("api_keys")
    .select("id,name,key_prefix,created_at,last_used_at,revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as ApiKeyRecord[];
}

export async function createApiKey(userId: string, name: string): Promise<{ record: ApiKeyRecord; raw: string } | null> {
  const db = await serviceClient();
  if (!db) return null;
  const { raw, prefix, hash } = generateApiKey();
  const { data, error } = await db
    .from("api_keys")
    .insert({ user_id: userId, name, key_prefix: prefix, key_hash: hash })
    .select("id,name,key_prefix,created_at")
    .single();
  if (error || !data) return null;
  return { record: data as ApiKeyRecord, raw };
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const db = await serviceClient();
  if (!db) return false;
  const { error } = await db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId);
  return !error;
}
