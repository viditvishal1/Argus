"use client";

import { useEffect, useState } from "react";
import type { AlertRuleType } from "@/lib/alerts/rules";

const RULE_TYPES: { value: AlertRuleType; label: string }[] = [
  { value: "severity_threshold", label: "Severity threshold" },
  { value: "module_tag", label: "Module + tag" },
  { value: "keyword", label: "Keyword" },
  { value: "cross_domain", label: "Cross-domain" },
  { value: "watchlist_match", label: "Watchlist match" },
];

export function AlertRuleBuilder() {
  const [rules, setRules] = useState<Array<{ id: string; name: string; ruleType: string; enabled: boolean }>>([]);
  const [searches, setSearches] = useState<Array<{ id: string; name: string; query: string; enabled: boolean }>>([]);
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<AlertRuleType>("keyword");
  const [keyword, setKeyword] = useState("");
  const [module, setModule] = useState("cyber");
  const [tag, setTag] = useState("");
  const [minSeverity, setMinSeverity] = useState(7);
  const [searchName, setSearchName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [a, s] = await Promise.all([
      fetch("/api/v1/alerts?limit=1").then((r) => r.json()),
      fetch("/api/v1/search/saved").then((r) => r.json()),
    ]);
    setRules(a.rules ?? []);
    setSearches(s.searches ?? []);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const id = `rule_${Date.now().toString(36)}`;
    const config: Record<string, unknown> = {};
    if (ruleType === "severity_threshold" || ruleType === "cross_domain") config.minSeverity = minSeverity;
    if (ruleType === "module_tag" || ruleType === "cross_domain") {
      if (module) config.module = module;
      if (tag) config.tag = tag;
    }
    if (ruleType === "keyword") config.keyword = keyword;
    if (ruleType === "cross_domain" && module) config.modules = [module, "conflict", "earth"];

    const res = await fetch("/api/v1/alerts/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: name || "Custom rule", ruleType, enabled: true, config }),
    });
    if (!res.ok) {
      setMessage("Sign in or set ARGUS_API_SECRET to manage rules in production.");
      return;
    }
    setName("");
    setKeyword("");
    setMessage("Rule saved.");
    await refresh();
  }

  async function saveSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = `ss_${Date.now().toString(36)}`;
    const res = await fetch("/api/v1/search/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: searchName || "Saved search", query: searchQuery, enabled: true }),
    });
    if (!res.ok) {
      setMessage("Auth required to save searches in production.");
      return;
    }
    setSearchName("");
    setSearchQuery("");
    setMessage("Saved search created — alerts fire on keyword match during ingest.");
    await refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-ink-dim">
        Alert rules evaluate on every ingest. Saved searches become keyword alert rules automatically.
      </p>

      <form onSubmit={saveRule} className="space-y-2 rounded border border-line/60 bg-panel-2/30 p-3">
        <p className="text-xs font-medium text-ink">New alert rule</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rule name"
          className="w-full rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
        />
        <select
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as AlertRuleType)}
          className="w-full rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
        >
          {RULE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {(ruleType === "keyword") && (
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword to match in title/summary"
            className="w-full rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
          />
        )}
        {(ruleType === "module_tag" || ruleType === "cross_domain") && (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={module}
              onChange={(e) => setModule(e.target.value)}
              placeholder="Module"
              className="rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
            />
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Tag (optional)"
              className="rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
            />
          </div>
        )}
        {(ruleType === "severity_threshold" || ruleType === "cross_domain") && (
          <label className="flex items-center gap-2 text-xs text-ink-dim">
            Min severity
            <input
              type="number"
              min={1}
              max={10}
              value={minSeverity}
              onChange={(e) => setMinSeverity(Number(e.target.value))}
              className="w-16 rounded border border-line bg-panel px-2 py-1 text-xs text-ink"
            />
          </label>
        )}
        <button type="submit" className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-body">
          Save rule
        </button>
      </form>

      <form onSubmit={saveSearch} className="space-y-2 rounded border border-line/60 bg-panel-2/30 p-3">
        <p className="text-xs font-medium text-ink">Saved search → alert</p>
        <input
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Search name"
          className="w-full rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Keyword query"
          required
          className="w-full rounded border border-line bg-panel px-2 py-1.5 text-xs text-ink"
        />
        <button type="submit" className="rounded border border-line bg-panel px-3 py-1.5 text-xs text-ink hover:bg-panel-2">
          Save search
        </button>
      </form>

      {message && <p className="text-xs text-ink-dim">{message}</p>}

      {rules.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-dim">Active rules ({rules.length})</p>
          {rules.slice(0, 8).map((r) => (
            <div key={r.id} className="flex justify-between py-0.5 text-[11px]">
              <span className={r.enabled ? "text-ink" : "text-ink-dim line-through"}>{r.name}</span>
              <span className="mono text-ink-dim">{r.ruleType}</span>
            </div>
          ))}
        </div>
      )}

      {searches.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-dim">Saved searches ({searches.length})</p>
          {searches.map((s) => (
            <div key={s.id} className="py-0.5 text-[11px] text-ink">
              {s.name} — <span className="text-ink-dim">{s.query}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
