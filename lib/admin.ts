import { format } from "date-fns";

export const adminNavItems = [
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/branding", label: "Branding" },
] as const;

export const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDayLabel(dayOfWeek: number) {
  return dayOptions.find((option) => option.value === dayOfWeek)?.label ?? "Unknown";
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

export function formatBlackoutRange(startAt: Date, endAt: Date) {
  return `${format(startAt, "EEE, MMM d h:mm a")} to ${format(endAt, "h:mm a")}`;
}
