import { aiEnabled, pingGemini } from "@/lib/ai";
import { noCacheJson } from "@/lib/http/no-cache";

export const dynamic = "force-dynamic";

/** Gemini connectivity probe — never exposes secrets. */
export async function GET() {
  if (!aiEnabled()) {
    return noCacheJson(
      {
        configured: false,
        ok: false,
        state: "key-required",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    const result = await pingGemini();
    return noCacheJson({
      configured: true,
      ok: true,
      state: "ready",
      model: result.model,
      latencyMs: result.latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini health check failed";
    return noCacheJson(
      {
        configured: true,
        ok: false,
        state: "unavailable",
        error: message.slice(0, 200),
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
