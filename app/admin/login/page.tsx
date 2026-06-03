"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// Kept in sync with ADMIN_CREDENTIALS_PROVIDER_ID in lib/customer-auth.ts.
// Hardcoded here so this client page doesn't import the server auth module.
const ADMIN_CREDENTIALS_PROVIDER_ID = "admin-credentials";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn(ADMIN_CREDENTIALS_PROVIDER_ID, {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (!result || result.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="admin-panel p-8">
        <h1 className="text-2xl font-semibold">Acceso de administración</h1>
        <p className="mt-2 text-sm text-muted">
          Ingresa con tu cuenta de administrador para gestionar el negocio.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="admin-button-primary mt-2 py-2 text-sm font-semibold"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
