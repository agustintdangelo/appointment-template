export function isValidGenericPhoneNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (!/^[+\d\s().-]+$/.test(trimmedValue)) {
    return false;
  }

  const digits = trimmedValue.replace(/\D/g, "");

  return digits.length >= 7 && digits.length <= 20;
}

export function normalizeContactEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeContactText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
