// pgvector embedding generation — Gemini text-embedding when configured.

import { dbEnabled } from "@/lib/db";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || text.length < 3) return null;

  try {
    const model = process.env.GEMINI_EMBED_MODEL ?? "text-embedding-004";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: text.slice(0, 8000) }] },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values = data.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}

export async function upsertEntityEmbedding(entityId: string, text: string): Promise<boolean> {
  if (!dbEnabled() || !process.env.SUPABASE_SERVICE_KEY) return false;
  const embedding = await generateEmbedding(text);
  if (!embedding) return false;

  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const c = createClient(url!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });

  const { error } = await c.from("entity_embeddings").upsert({
    entity_id: entityId,
    embedding,
    model: process.env.GEMINI_EMBED_MODEL ?? "text-embedding-004",
    updated_at: new Date().toISOString(),
  });
  return !error;
}
