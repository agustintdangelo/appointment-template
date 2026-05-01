import { format } from "date-fns";

import {
  DEFAULT_LOCALE,
  getDateFnsLocale,
  normalizeLocale,
  t,
  type AppLocale,
} from "@/lib/i18n";

function getMoneyFormatter(locale: AppLocale) {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatMoney(priceCents: number, localeInput: unknown = DEFAULT_LOCALE) {
  const locale = normalizeLocale(localeInput);

  return getMoneyFormatter(locale).format(priceCents / 100);
}

export function formatServiceTiming(
  durationMinutes: number,
  bufferMinutes: number,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  if (bufferMinutes > 0) {
    return t(localeInput, "format.serviceTimingWithBuffer", {
      duration: durationMinutes,
      buffer: bufferMinutes,
    });
  }

  return t(localeInput, "format.serviceTiming", {
    duration: durationMinutes,
  });
}

export function formatAppointmentDateTime(
  value: Date,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  const locale = normalizeLocale(localeInput);

  return format(value, t(locale, "format.appointmentDateTime"), {
    locale: getDateFnsLocale(locale),
  });
}
