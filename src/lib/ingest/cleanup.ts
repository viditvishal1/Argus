// Retention cleanup — expires ingestion records and old connector runs.

import { dbEnabled } from "@/lib/db";
import { computeExpiresAt } from "@/lib/storage/retention";

async function serviceClient() {
  if (!dbEnabled() || !process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

export async function runRetentionCleanup(): Promise<{
  ingestionDeleted: number;
  runsDeleted: number;
  searchDocsDeleted: number;
}> {
  const c = await serviceClient();
  if (!c) return { ingestionDeleted: 0, runsDeleted: 0, searchDocsDeleted: 0 };

  const now = new Date().toISOString();
  const runCutoff = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const searchCutoff = computeExpiresAt("normalized").toISOString();

  let ingestionDeleted = 0;
  let runsDeleted = 0;
  let searchDocsDeleted = 0;

  const { data: expiredIngestion } = await c
    .from("ingestion_records")
    .delete()
    .lt("expires_at", now)
    .not("expires_at", "is", null)
    .select("id");
  ingestionDeleted = expiredIngestion?.length ?? 0;

  const { data: oldRuns } = await c
    .from("connector_runs")
    .delete()
    .lt("started_at", runCutoff)
    .select("id");
  runsDeleted = oldRuns?.length ?? 0;

  const { data: oldDocs } = await c
    .from("search_documents")
    .delete()
    .lt("ingested_at", searchCutoff)
    .select("id");
  searchDocsDeleted = oldDocs?.length ?? 0;

  return { ingestionDeleted, runsDeleted, searchDocsDeleted };
}
