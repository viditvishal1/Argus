// In-app reader extraction — fetches article URLs, extracts readable HTML text
// or surfaces PDFs for in-app viewing. Results are cached (in-process + optional
// Supabase) so repeat reads don't re-fetch.

import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/connectors/framework";
import { readArticleCache, writeArticleCache } from "@/lib/article-cache";
import { publish } from "@/lib/events/bus";
import {
  MAX_FETCH_BYTES,
  MAX_REDIRECTS,
  validateOutboundUrl,
  validateRedirectUrl,
} from "@/lib/security/url-validator";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function extract(html: string): { title?: string; paragraphs: string[] } {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const title = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  const scope = articleMatch ? articleMatch[0] : cleaned;

  const paragraphs: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(scope)) !== null) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text.length > 60) paragraphs.push(text);
    if (paragraphs.length >= 60) break;
  }
  return { title: title ? decodeEntities(title) : undefined, paragraphs };
}

function isPdfContentType(ct: string | null): boolean {
  return Boolean(ct?.includes("application/pdf"));
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/article");
  const rl = await checkRateLimit({ key: `article:${clientKey(req)}`, ...LIMITS.article });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const url = req.nextUrl.searchParams.get("url");
  const skipCache = req.nextUrl.searchParams.get("refresh") === "1";
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const validated = validateOutboundUrl(url);
  if (!validated.ok || !validated.url) {
    return NextResponse.json({ error: validated.error ?? "url not allowed" }, { status: 400 });
  }
  const parsed = validated.url;

  if (!skipCache) {
    const cached = await readArticleCache(url);
    if (cached) {
      return NextResponse.json({
        title: cached.title,
        paragraphs: cached.paragraphs,
        pdfUrl: cached.pdfUrl,
        contentType: cached.contentType,
        fetchedAt: cached.fetchedAt,
        cached: true,
      });
    }
  }

  if (isPdfUrl(url)) {
    const fetchedAt = new Date().toISOString();
    const entry = { url, pdfUrl: url, contentType: "pdf" as const, fetchedAt };
    await writeArticleCache(entry);
    await publish({ type: "article.cached", meta: { url, contentType: "pdf" } });
    return NextResponse.json({ ...entry, cached: false });
  }

  try {
    let currentUrl = parsed.toString();
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetchWithTimeout(currentUrl, {
        timeoutMs: 12000,
        headers: { Accept: "text/html,application/pdf" },
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) break;
        const redirectCheck = validateRedirectUrl(location, parsed.hostname);
        if (!redirectCheck.ok || !redirectCheck.url) {
          return NextResponse.json({ error: "redirect not allowed" }, { status: 400 });
        }
        currentUrl = redirectCheck.url.toString();
        continue;
      }
      break;
    }
    if (!res) throw new Error("fetch failed");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ct = res.headers.get("content-type");
    if (isPdfContentType(ct)) {
      const fetchedAt = new Date().toISOString();
      const entry = { url, pdfUrl: url, contentType: "pdf" as const, fetchedAt };
      await writeArticleCache(entry);
      await publish({ type: "article.cached", meta: { url, contentType: "pdf" } });
      return NextResponse.json({ ...entry, cached: false });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FETCH_BYTES) {
      return NextResponse.json({ error: "response too large" }, { status: 413 });
    }
    const html = new TextDecoder().decode(buf).slice(0, MAX_FETCH_BYTES);
    const { title, paragraphs } = extract(html);
    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: "Could not extract readable text — use the original link", title },
        { status: 422 },
      );
    }

    const fetchedAt = new Date().toISOString();
    await writeArticleCache({ url, title, paragraphs, contentType: "html", fetchedAt });
    await publish({ type: "article.cached", meta: { url, contentType: "html" } });

    return NextResponse.json({ title, paragraphs, contentType: "html", fetchedAt, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 },
    );
  }
}
