import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { computeCiiV1 } from "@/lib/intelligence/cii/v1";
import { findingsForCountry } from "@/lib/intelligence/findings";
import { getCountry } from "@/lib/geo/country-index";
import { readModuleLiveCached } from "@/lib/live/module-cache";
import { countryBriefToMarkdown, itemsToCsv, withProvenanceFooter } from "@/lib/exports/formats";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadItems(): Promise<Item[]> {
  const mods = await Promise.all(
    ["earth", "news", "conflict", "cyber", "government"].map((m) => readModuleLiveCached(m)),
  );
  return mods.flatMap((r) => r?.data ?? []);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ iso2: string }> },
) {
  const { iso2 } = await ctx.params;
  const country = getCountry(iso2);
  if (!country) {
    return noCacheJson({ error: "unknown country", iso2 }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const items = await loadItems();
  const cii = computeCiiV1(iso2, items);
  const findings = findingsForCountry(items, iso2);
  const exportedAt = new Date().toISOString();
  const disclaimer = "CII v1 is an editorial model from available public feeds — not a verified forecast.";

  const payload = {
    iso2: country.iso2,
    country: country.name,
    region: country.region,
    cii,
    findings,
    exportedAt,
    disclaimer,
  };

  if (format === "json") {
    return noCacheJson(payload);
  }

  if (format === "csv") {
    const rows = cii.components.map((c) => ({
      iso2: country.iso2,
      component: c.label,
      score: c.score.toFixed(1),
      evidence: c.evidenceCount,
    }));
    const csv = itemsToCsv(rows, ["iso2", "component", "score", "evidence"]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="country-${country.iso2}.csv"`,
      },
    });
  }

  if (format === "markdown" || format === "md") {
    const md = withProvenanceFooter(
      countryBriefToMarkdown({
        country: country.name,
        iso2: country.iso2,
        region: country.region,
        cii,
        findings,
        disclaimer,
      }),
      { exportedAt, disclaimer },
    );
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="country-${country.iso2}.md"`,
      },
    });
  }

  return noCacheJson({ error: "unsupported format", supported: ["json", "csv", "markdown"] }, { status: 400 });
}
