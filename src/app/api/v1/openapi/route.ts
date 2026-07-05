import { noCacheJson } from "@/lib/http/no-cache";
import { OPENAPI_SPEC } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  return noCacheJson(OPENAPI_SPEC);
}
