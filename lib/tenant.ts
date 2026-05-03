export function normalizeBusinessSlug(value: string) {
  return value.trim().toLowerCase();
}

export function buildPublicBusinessPath(businessSlug: string, path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath === "/") {
    return `/${businessSlug}`;
  }

  return `/${businessSlug}${normalizedPath}`;
}

export function buildAdminBusinessPath(businessSlug: string, path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath === "/") {
    return `/admin/${businessSlug}`;
  }

  return `/admin/${businessSlug}${normalizedPath}`;
}
