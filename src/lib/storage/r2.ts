// Cloudflare R2 raw archive — batched, partitioned object storage via S3-compatible API.

import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { createHash } from "crypto";
import { gzipSync } from "zlib";

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

export function r2Enabled(): boolean {
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
  return `raw/${sourceId}/${yyyy}/${mm}/${dd}/${hh}/${batchId}.json.gz`;
}

/** Archive a batch of records to R2. No-op when R2 disabled. */
export async function archiveRawBatch(batch: ArchiveBatch): Promise<ArchiveResult> {
  const enabled = (await isFeatureEnabled("r2_archive")) && r2Enabled();
  const payload = JSON.stringify({
    source_id: batch.sourceId,
    provider: batch.provider,
    observed_at: batch.observedAt ?? new Date().toISOString(),
    record_count: batch.records.length,
    records: batch.records,
  });

  const batchId = createHash("sha256").update(payload).digest("hex").slice(0, 16);
  const key = objectPath(batch.sourceId, batchId);
  const body = gzipSync(Buffer.from(payload, "utf8"));
  const bytes = body.byteLength;

  if (!enabled) return { ok: false, error: "r2 disabled", bytes };

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket()!,
        Key: key,
        Body: body,
        ContentType: "application/json",
        ContentEncoding: "gzip",
        Metadata: {
          source: batch.sourceId,
          "record-count": String(batch.records.length),
        },
      }),
    );

    return { ok: true, objectKey: key, bytes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "R2 error", bytes };
  }
}

export function contentHash(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
