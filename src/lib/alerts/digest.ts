import type { AlertEvent } from "@/lib/alerts/engine";
import { listRecentAlerts } from "@/lib/alerts/engine";
import type { Finding } from "@/lib/intelligence/findings";
import { detectFindings } from "@/lib/intelligence/findings";
import type { Item } from "@/lib/types";

export function buildAlertDigestMarkdown(alerts: AlertEvent[], findings: Finding[]): string {
  const lines = [
    "# Argus intelligence digest",
    "",
    `_Generated ${new Date().toISOString()}_`,
    "",
    "## Recent alerts",
    "",
  ];
  if (!alerts.length) {
    lines.push("_No alert events in window._", "");
  } else {
    for (const a of alerts.slice(0, 20)) {
      lines.push(`- **${a.severity}** — ${a.title}${a.message ? `: ${a.message}` : ""}`);
    }
    lines.push("");
  }
  lines.push("## Cross-domain findings", "");
  if (!findings.length) {
    lines.push("_No findings in window._", "");
  } else {
    for (const f of findings.slice(0, 15)) {
      lines.push(`### ${f.title}`, "", f.summary, "", `Confidence: ${(f.confidence * 100).toFixed(0)}% · ${f.signalType}`, "");
      if (f.evidence.length) {
        lines.push("Evidence:");
        for (const e of f.evidence.slice(0, 5)) {
          lines.push(`- ${e.title} (${e.source})${e.url ? ` — ${e.url}` : ""}`);
        }
        lines.push("");
      }
    }
  }
  lines.push("---", "Argus digest export — not an official warning product.");
  return lines.join("\n");
}

export async function buildDigestFromItems(items: Item[]): Promise<string> {
  const [alerts, findings] = await Promise.all([
    listRecentAlerts(25),
    Promise.resolve(detectFindings(items, { limit: 15 })),
  ]);
  return buildAlertDigestMarkdown(alerts, findings);
}
