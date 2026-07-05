export type LocaleId = "en" | "hi" | "ar";

export const LOCALES: { id: LocaleId; label: string; dir: "ltr" | "rtl" }[] = [
  { id: "en", label: "English", dir: "ltr" },
  { id: "hi", label: "हिन्दी", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
];

export const DEFAULT_LOCALE: LocaleId = "en";
