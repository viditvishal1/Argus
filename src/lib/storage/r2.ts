// Cloudflare R2 raw archive — batched, partitioned object storage.

import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { createHash } from "crypto";

export interface ArchiveBatch {
  sourceId: string;
  provider: string;
  records: unknown[];
  observedAt?: string;
}

export interface ArchiveResult {
  ok: boolean;
  objectKey?: string;
  error?: string;
  bytes?: number;
}

function bucket(): string | undefined {
  return process.env.CLOUDFLARE_R2_BUCKET;
}

function r2Enabled(): boolean {
  return Boolean(
    bucket() &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  );
}

function objectPath(sourceId: string, batchId: string): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `raw/${sourceId}/${yyyy}/${mm}/${dd}/${hh}/${batchId}.json.zst`;
}

/** Archive a batch of records to R2. No-op when R2 disabled. */
export async function archiveRawBatch(batch: ArchiveBatch): Promise<ArchiveResult> {
  const enabled = (await isFeatureEnabled("r2_archive")) && r2Enabled();
  if (!enabled) return { ok: false, error: "r2 disabled" };

  const payload = JSON.stringify({
    source_id: batch.sourceId,
    provider: batch.provider,
    observed_at: batch.observedAt ?? new Date().toISOString(),
    record_count: batch.records.length,
    records: batch.records,
  });

  const batchId = createHash("sha256").update(payload).digest("hex").slice(0, 16);
  const key = objectPath(batch.sourceId, batchId);
  const bytes = Buffer.byteLength(payload, "utf8");

  try {
    // S3-compatible R2 API via fetch (aws4 signing omitted — use @aws-sdk in production)
    // Phase 1: store intent + key; full SDK integration when credentials configured
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
    const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket()}/${key}`;

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessKey}`,
        "x-amz-meta-source": batch.sourceId,
        "x-amz-meta-record-count": String(batch.records.length),
      },
      body: payload,
    });

    if (!res.ok) {
      return { ok: false, error: `R2 upload failed: ${res.status}`, bytes };
    }
    return { ok: true, objectKey: key, bytes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "R2 error", bytes };
  }
}

export function contentHash(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export { r2Enabled };
