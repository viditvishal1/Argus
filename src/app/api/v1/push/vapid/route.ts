import { noCacheJson } from "@/lib/http/no-cache";

export const dynamic = "force-dynamic";

/** Web Push VAPID public key for client subscription (G19). */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
  return noCacheJson({
    configured: Boolean(publicKey && process.env.VAPID_PRIVATE_KEY),
    publicKey,
  });
}
