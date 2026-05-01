import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  PUBLIC_LOCALE_COOKIE,
  isSupportedLocale,
  normalizeLocale,
  type AppLocale,
} from "@/lib/i18n";

export async function getPublicLocale(defaultLocale?: string | null): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(PUBLIC_LOCALE_COOKIE)?.value;

  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  return normalizeLocale(defaultLocale ?? DEFAULT_LOCALE);
}

export function getBusinessLocale(defaultLocale?: string | null): AppLocale {
  return normalizeLocale(defaultLocale ?? DEFAULT_LOCALE);
}
