import type { LocaleId } from "./types";

const catalogs: Record<LocaleId, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.methodology": "Methodology",
    "freshness.title": "Source freshness",
    "country.brief": "Country Brief",
    "export.markdown": "Export MD",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.methodology": "कार्यप्रणाली",
    "freshness.title": "स्रोत ताजगी",
    "country.brief": "देश ब्रीफ",
    "export.markdown": "MD निर्यात",
  },
  ar: {
    "nav.dashboard": "لوحة التحكم",
    "nav.methodology": "المنهجية",
    "freshness.title": "حداثة المصادر",
    "country.brief": "ملخص البلد",
    "export.markdown": "تصدير MD",
  },
};

export function t(locale: LocaleId, key: string): string {
  return catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
}

export function isRtl(locale: LocaleId): boolean {
  return locale === "ar";
}

export { type LocaleId } from "./types";
