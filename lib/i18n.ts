// Minimal i18n stub. Replace with real i18n later.

export type Language = "en" | "es" | "hi" | "fr" | "ar" | "zh"

export interface I18nConfig {
  language: Language
  direction: "ltr" | "rtl"
}

export const defaultConfig: I18nConfig = {
  language: "en",
  direction: "ltr",
}

export function getI18nConfig(language: Language): I18nConfig {
  const rtl: Language[] = ["ar"]
  return {
    language,
    direction: rtl.includes(language) ? "rtl" : "ltr",
  }
}

type TranslationFn = (key: string, fallback?: string) => string

// Overloaded: callable as either getTranslation(lang, key, fallback) or as a curry getTranslation(lang)(key, fallback)
export function getTranslation(language: Language): TranslationFn
export function getTranslation(language: Language, key: string, fallback?: string): string
export function getTranslation(
  language: Language,
  key?: string,
  fallback?: string,
): string | TranslationFn {
  void language
  if (typeof key === "undefined") {
    return (k: string, fb?: string) => fb ?? k
  }
  return fallback ?? key
}
