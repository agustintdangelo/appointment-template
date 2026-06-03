/**
 * Centralized validation of server-side environment variables.
 *
 * Run once at boot (see instrumentation.ts) so that a misconfigured
 * deployment fails fast with a clear message instead of throwing an opaque
 * `[next-auth][error][NO_SECRET]` at the first admin request.
 */

const PLACEHOLDER_PREFIX = "replace-with-";

function isMissing(value: string | undefined): boolean {
  return !value || !value.trim() || value.startsWith(PLACEHOLDER_PREFIX);
}

/**
 * Validate the variables required for the app to boot safely.
 *
 * `NEXTAUTH_SECRET` is required in every environment: NextAuth signs admin and
 * customer session tokens with it, and without it admin routes are effectively
 * unprotected. In production a missing secret throws; in development we allow a
 * generated fallback but warn loudly.
 */
export function validateServerEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";

  if (isMissing(process.env.DATABASE_URL)) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in your environment (see .env.example).",
    );
  }

  if (isMissing(process.env.NEXTAUTH_SECRET)) {
    const message =
      "NEXTAUTH_SECRET is not configured. Admin authentication requires a long random secret. " +
      "Generate one with `openssl rand -base64 32` and set NEXTAUTH_SECRET (see .env.example).";

    if (isProduction) {
      throw new Error(message);
    }

    console.warn(`[env] ${message} Continuing in development only.`);
  }
}
