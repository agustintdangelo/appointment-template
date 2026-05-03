import Link from "next/link";

import LocalizedSection from "@/app/components/localized-section";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getPrimaryBusiness } from "@/lib/queries";
import { buildAdminBusinessPath, buildPublicBusinessPath } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const business = await getPrimaryBusiness();
  const locale = await getPublicLocale(business?.defaultLocale);

  return (
    <main lang={locale} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <LocalizedSection
          as="section"
          order={1}
          className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              {t(locale, "public.platform.eyebrow")}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.98] sm:text-6xl">
              {t(locale, "public.platform.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              {t(locale, "public.platform.description")}
            </p>
          </div>

          <aside className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            {business ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">
                  {t(locale, "public.platform.demoBusiness")}
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{business.name}</h2>
                <p className="mt-2 text-sm text-muted">/{business.slug}</p>
                <div className="mt-6 grid gap-3">
                  <Link
                    href={buildPublicBusinessPath(business.slug)}
                    className="admin-button-primary justify-center"
                  >
                    {t(locale, "public.platform.openDemo")}
                  </Link>
                  <Link
                    href={buildPublicBusinessPath(business.slug, "/book")}
                    className="admin-button-secondary justify-center"
                  >
                    {t(locale, "public.platform.openDemoBooking")}
                  </Link>
                  <Link
                    href={buildAdminBusinessPath(business.slug, "/calendar")}
                    className="admin-button-secondary justify-center"
                  >
                    {t(locale, "public.platform.openDemoAdmin")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">
                  {t(locale, "common.setupRequired")}
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  {t(locale, "public.platform.setupTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {t(locale, "public.platform.setupDescription")}
                </p>
              </>
            )}
          </aside>
        </LocalizedSection>
      </div>
    </main>
  );
}
