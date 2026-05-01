import { format } from "date-fns";

import {
  DEFAULT_LOCALE,
  getDateFnsLocale,
  getWeekdayLabel,
  getWeekdayOptions,
  normalizeLocale,
} from "@/lib/i18n";

export const adminNavItems = [
  { href: "/admin/calendar", labelKey: "nav.calendar" },
  { href: "/admin/appointments", labelKey: "nav.appointments" },
  { href: "/admin/services", labelKey: "nav.services" },
  { href: "/admin/staff", labelKey: "nav.staff" },
  { href: "/admin/branding", labelKey: "nav.branding" },
  { href: "/admin/settings", labelKey: "nav.settings" },
] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDayLabel(dayOfWeek: number) {
  return getLocalizedDayLabel(dayOfWeek);
}

export function getLocalizedDayOptions(localeInput: unknown = DEFAULT_LOCALE) {
  return getWeekdayOptions(localeInput);
}

export function getLocalizedDayLabel(
  dayOfWeek: number,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  return getWeekdayLabel(dayOfWeek, localeInput);
}

export function getFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function getOptionalFormString(value: FormDataEntryValue | null) {
  const normalizedValue = getFormString(value);
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

export function getFormCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function getLocalDateTimeInputValue(value: Date) {
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export function formatBlackoutRange(
  startAt: Date,
  endAt: Date,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  const locale = normalizeLocale(localeInput);
  const dateLocale = getDateFnsLocale(locale);

  if (locale === "es") {
    return `${format(startAt, "EEE d MMM h:mm a", { locale: dateLocale })} a ${format(
      endAt,
      "h:mm a",
      { locale: dateLocale },
    )}`;
  }

  return `${format(startAt, "EEE, MMM d h:mm a", { locale: dateLocale })} to ${format(
    endAt,
    "h:mm a",
    { locale: dateLocale },
  )}`;
}
