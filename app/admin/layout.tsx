import type { ReactNode } from "react";

import { AdminNav } from "@/app/admin/admin-ui";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import { getAdminBusinessSummary } from "@/lib/queries";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const business = await getAdminBusinessSummary();
  const locale = getBusinessLocale(business?.defaultLocale);

  return (
    <div lang={locale} className="admin-shell min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <section className="admin-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            {t(locale, "admin.layoutEyebrow")}
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                {business?.name ?? t(locale, "admin.seedAdminPages")}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                {t(locale, "admin.layoutDescription")}
              </p>
            </div>
            <AdminNav locale={locale} />
          </div>
        </section>

        {children}
      </div>
    </div>
  );
}
