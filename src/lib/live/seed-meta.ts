import { cacheGet, cacheSet } from "@/lib/cache/redis";

export interface SeedMeta {
  domain: string;
  recordCount: number;
  fetchedAt: string;
  source: string;
}

export async function writeSeedMeta(domain: string, recordCount: number, source: string): Promise<void> {
  const meta: SeedMeta = {
    domain,
    recordCount,
    fetchedAt: new Date().toISOString(),
    source,
  };
  await cacheSet(`seed-meta:${domain}`, meta, 86_400).catch(() => {});
}

export async function readSeedMeta(domain: string): Promise<SeedMeta | null> {
  return cacheGet<SeedMeta>(`seed-meta:${domain}`).catch(() => null);
}

export async function readAllSeedMeta(domains: string[]): Promise<Record<string, SeedMeta | null>> {
  const out: Record<string, SeedMeta | null> = {};
  await Promise.all(
    domains.map(async (d) => {
      out[d] = await readSeedMeta(d);
    }),
  );
  return out;
}
