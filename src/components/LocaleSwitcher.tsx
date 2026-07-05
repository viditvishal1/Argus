"use client";

import { LOCALES } from "@/lib/i18n/types";
import { useLocale } from "@/lib/i18n/useLocale";
import { Languages } from "lucide-react";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <label className="inline-flex items-center gap-1 text-ink-dim">
      <Languages className="h-4 w-4" aria-hidden />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="rounded border border-line bg-panel px-1.5 py-0.5 text-xs text-ink"
        aria-label="Language"
      >
        {LOCALES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
