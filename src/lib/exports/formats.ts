/** Export helpers (G46) — JSON, CSV, Markdown with provenance footer. */

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function itemsToCsv(
  rows: Record<string, string | number | undefined>[],
  columns: string[],
): string {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(String(row[c] ?? ""))).join(","),
  );
  return [header, ...lines].join("\n");
}

export function withProvenanceFooter(md: string, meta: { exportedAt: string; disclaimer: string }): string {
  return `${md}\n\n---\n_Exported ${meta.exportedAt} · ${meta.disclaimer}_\n`;
}

export function countryBriefToMarkdown(data: {
  country: string;
  iso2: string;
  region: string;
  cii: { score: number; band: string; methodologyVersion: string; coverageState: string };
  findings: { title: string; summary: string }[];
  disclaimer: string;
}): string {
  const lines = [
    `# Country Brief — ${data.country} (${data.iso2})`,
    "",
    `**CII ${data.cii.methodologyVersion}:** ${data.cii.score}/100 (${data.cii.band}) · coverage: ${data.cii.coverageState}`,
    "",
    "## Findings",
    ...data.findings.map((f) => `- **${f.title}** — ${f.summary}`),
    "",
    `_${data.disclaimer}_`,
  ];
  return lines.join("\n");
}
