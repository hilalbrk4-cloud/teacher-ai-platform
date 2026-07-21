"use client";

import * as React from "react";

import { defaultLocale, getDictionary } from "@/lib/i18n/config";
import type { Dictionary, Locale } from "@/types/i18n";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale = defaultLocale,
  children,
}: {
  locale?: Locale;
  children: React.ReactNode;
}) {
  const value = React.useMemo<LocaleContextValue>(
    () => ({ locale, dict: getDictionary(locale) }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslations(): Dictionary {
  const context = React.useContext(LocaleContext);
  if (!context) {
    throw new Error("useTranslations must be used within a LocaleProvider");
  }
  return context.dict;
}

export function useLocale(): Locale {
  const context = React.useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context.locale;
}
