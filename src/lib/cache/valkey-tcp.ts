/**
 * Valkey/Redis TCP adapter for Docker self-host (G43).
 * Used when VALKEY_URL or REDIS_URL is set but Upstash REST is not.
 */
import Redis from "ioredis";

const g = globalThis as unknown as { __argusValkeyTcp?: Redis };

export function valkeyTcpUrl(): string | null {
  return process.env.VALKEY_URL?.trim() || process.env.REDIS_URL?.trim() || null;
}

export function valkeyTcpConfigured(): boolean {
  const url = valkeyTcpUrl();
  return Boolean(url && (url.startsWith("redis://") || url.startsWith("rediss://")));
}

export function getValkeyTcpClient(): Redis | null {
  const url = valkeyTcpUrl();
  if (!url || !valkeyTcpConfigured()) return null;
  if (!g.__argusValkeyTcp) {
    g.__argusValkeyTcp = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
  }
  return g.__argusValkeyTcp;
}

export async function valkeyTcpGet(key: string): Promise<string | null> {
  const client = getValkeyTcpClient();
  if (!client) return null;
  try {
    await client.connect().catch(() => {});
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function valkeyTcpSet(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const client = getValkeyTcpClient();
  if (!client) return false;
  try {
    await client.connect().catch(() => {});
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, "EX", ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}
