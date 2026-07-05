/**
 * Telegram public channel connector (G06) — reads t.me/s preview pages.
 * Configure TELEGRAM_CHANNELS=comma,separated,usernames (no @).
 */

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

function parseChannelHtml(html: string, channel: string): Item[] {
  const items: Item[] = [];
  const re = /data-post="([^"]+)"[\s\S]*?tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html)) && i < 25) {
    const postPath = m[1];
    const raw = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!raw) continue;
    items.push({
      id: `telegram:${postPath.replace(/\//g, ":")}`,
      module: "news",
      connectorId: "telegram_channels",
      title: raw.slice(0, 140),
      summary: `@${channel} · public channel`,
      url: `https://t.me/${postPath}`,
      source: `Telegram @${channel}`,
      timestamp: new Date().toISOString(),
      tags: ["telegram", channel],
      entities: [{ name: channel, type: "organization" }],
      contentPolicy: "excerpt_only",
      region: "global",
    });
    i++;
  }
  return items;
}

async function fetchTelegramChannel(channel: string): Promise<Item[]> {
  const res = await fetchWithTimeout(`https://t.me/s/${encodeURIComponent(channel)}`, {
    timeoutMs: 12000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ArgusBot/1.0)" },
  });
  if (!res.ok) return [];
  return parseChannelHtml(await res.text(), channel);
}

registerConnector(
  {
    id: "telegram_channels",
    module: "news",
    source: "Telegram (public channels)",
    sourceUrl: "https://telegram.org",
    scheduleSeconds: 300,
    contentPolicy: "excerpt_only",
    entityTypes: ["organization", "event"],
    requiresKey: "TELEGRAM_CHANNELS",
  },
  async () => {
    const raw = process.env.TELEGRAM_CHANNELS?.trim();
    if (!raw) return [];
    const channels = raw.split(",").map((c) => c.trim().replace(/^@/, "")).filter(Boolean);
    const batches = await Promise.all(channels.map((ch) => fetchTelegramChannel(ch).catch(() => [])));
    return batches.flat().slice(0, 80);
  },
);

export const TELEGRAM_CONNECTOR_ID = "telegram_channels";
