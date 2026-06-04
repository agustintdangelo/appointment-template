import { validateServerEnv } from "@/lib/env";

/**
 * Next.js runs this once when the server process starts. Validating required
 * environment variables here makes misconfiguration fail fast at boot rather
 * than at the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateServerEnv();
  }
}
