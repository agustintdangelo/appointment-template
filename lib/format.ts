import { format } from "date-fns";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(priceCents: number) {
  return moneyFormatter.format(priceCents / 100);
}

export function formatServiceTiming(durationMinutes: number, bufferMinutes: number) {
  if (bufferMinutes > 0) {
    return `${durationMinutes} min service + ${bufferMinutes} min buffer`;
  }

  return `${durationMinutes} min service`;
}

export function formatAppointmentDateTime(value: Date) {
  return format(value, "EEE, MMM d 'at' h:mm a");
}
