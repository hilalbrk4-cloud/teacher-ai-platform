import { en } from "@/lib/i18n/locales/en";
import { tr } from "@/lib/i18n/locales/tr";
import type { Dictionary, Locale } from "@/types/i18n";

export { locales } from "@/types/i18n";
export type { Locale } from "@/types/i18n";

export const defaultLocale: Locale = "tr";

const dictionaries: Record<Locale, Dictionary> = { tr, en };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}
