import type { ReactNode } from "react";

import { AdminNav } from "@/app/admin/admin-ui";
import { getAdminBusinessSummary } from "@/lib/queries";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const business = await getAdminBusinessSummary();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border bg-surface/90 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Admin workspace
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-5xl">
              {business?.name ?? "Seed the database to open admin pages"}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
              Manage the reusable appointment template through small, explicit operational pages.
            </p>
          </div>
          <AdminNav />
        </div>
      </section>

      {children}
    </div>
  );
}
