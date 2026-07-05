"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, type LocaleId } from "@/lib/i18n/types";
import { isRtl, t } from "@/lib/i18n";
import { loadPreferences, mergePreferences } from "@/lib/preferences/store";

export function useLocale() {
  const [locale, setLocaleState] = useState<LocaleId>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(loadPreferences().locale as LocaleId);
  }, []);

  const setLocale = (id: LocaleId) => {
    mergePreferences({ locale: id });
    setLocaleState(id);
    document.documentElement.lang = id;
    document.documentElement.dir = isRtl(id) ? "rtl" : "ltr";
  };

  return {
    locale,
    setLocale,
    t: (key: string) => t(locale, key),
    dir: isRtl(locale) ? "rtl" as const : "ltr" as const,
  };
}
