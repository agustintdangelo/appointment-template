import Link from "next/link";
import { notFound } from "next/navigation";

import LocalizedSection from "@/app/components/localized-section";
import { formatMoney, formatServiceTiming } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getBusinessBySlug } from "@/lib/queries";
import { buildAdminBusinessPath, buildPublicBusinessPath } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getBusinessBySlug(businessSlug);
  const locale = await getPublicLocale(business?.defaultLocale);

  if (!business) {
    notFound();
  }

  const featuredServices = business.services.slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-8">
      <LocalizedSection
        as="section"
        order={1}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]"
      >
        <div className="brand-panel-shadow rounded-[2rem] border border-border bg-card/95 p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.home.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] sm:text-6xl">
            {business.heroHeadline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            {business.heroSubheadline}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href={buildPublicBusinessPath(business.slug, "/book")}
              className="brand-accent-fill localized-action rounded-full px-6 py-3 font-semibold transition"
            >
              {t(locale, "public.home.startBooking")}
            </Link>
            <Link
              href={buildPublicBusinessPath(business.slug, "/services")}
              className="localized-action rounded-full border border-border px-6 py-3 font-semibold transition hover:bg-surface"
            >
              {t(locale, "public.home.browseServices")}
            </Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-border bg-surface/90 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.home.templateShape")}
          </p>
          <div className="mt-6 grid gap-5">
            <div>
              <p className="font-display text-3xl">{business.services.length}</p>
              <p className="mt-1 text-sm text-muted">
                {t(locale, "public.home.activeServices")}
              </p>
            </div>
            <div>
              <p className="font-display text-3xl">{business.staffMembers.length}</p>
              <p className="mt-1 text-sm text-muted">{t(locale, "public.home.staffMembers")}</p>
            </div>
            <div className="rounded-3xl bg-highlight-surface p-5 text-highlight-foreground">
              <p className="text-sm leading-7">
                {t(locale, "public.home.noFakeSlots")}
              </p>
            </div>
          </div>
        </aside>
      </LocalizedSection>

      <LocalizedSection as="section" order={2} className="grid gap-5 lg:grid-cols-3">
        {featuredServices.map((service) => (
          <article
            key={service.id}
            className="brand-accent-shadow min-h-[19rem] rounded-[1.75rem] border border-border bg-card/90 p-6"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-muted">
              {t(locale, "public.home.featuredService")}
            </p>
            <h2 className="mt-3 font-display text-3xl">{service.name}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span>{formatServiceTiming(service.durationMinutes, service.bufferMinutes, locale)}</span>
              <span className="font-semibold">{formatMoney(service.priceCents, locale)}</span>
            </div>
            <Link
              href={`${buildPublicBusinessPath(business.slug, "/book")}?service=${service.slug}`}
              className="brand-accent-outline localized-action mt-6 rounded-full border px-4 py-2 text-sm font-semibold transition"
            >
              {t(locale, "public.home.bookThisService")}
            </Link>
          </article>
        ))}
      </LocalizedSection>

      <LocalizedSection
        as="section"
        order={3}
        className="grid gap-6 rounded-[2rem] border border-border bg-surface/90 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.home.sliceIncludes")}
          </p>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-muted sm:grid-cols-2">
            <p>{t(locale, "public.home.includesCatalog")}</p>
            <p>{t(locale, "public.home.includesAvailability")}</p>
            <p>{t(locale, "public.home.includesBooking")}</p>
            <p>{t(locale, "public.home.includesAdmin")}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.home.demoNotes")}
          </p>
          <p className="mt-4 text-sm leading-7 text-muted">{business.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={buildPublicBusinessPath(business.slug, "/book")}
              className="brand-accent-fill localized-action rounded-full px-4 py-2 text-sm font-semibold transition"
            >
              {t(locale, "public.home.openBookingFlow")}
            </Link>
            <Link
              href={buildAdminBusinessPath(business.slug, "/appointments")}
              className="localized-action rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
            >
              {t(locale, "public.home.viewAdminList")}
            </Link>
          </div>
        </div>
      </LocalizedSection>
    </div>
  );
}
