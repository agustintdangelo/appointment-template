import Link from "next/link";

import { formatMoney, formatServiceTiming } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getPrimaryBusiness } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const business = await getPrimaryBusiness();
  const locale = await getPublicLocale(business?.defaultLocale);

  if (!business) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.services.noCatalogLoaded")}
        </p>
        <h1 className="font-display text-4xl">{t(locale, "common.seedDatabaseServices")}</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border bg-card/95 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.services.eyebrow")}
        </p>
        <h1 className="mt-4 font-display text-5xl">{t(locale, "public.services.title")}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          {t(locale, "public.services.description")}
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {business.services.map((service) => (
          <article
            key={service.id}
            className="brand-card-shadow rounded-[1.75rem] border border-border bg-surface/95 p-6"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-muted">
              {t(locale, "common.service")}
            </p>
            <h2 className="mt-3 font-display text-3xl">{service.name}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">{t(locale, "common.timing")}</dt>
                <dd>{formatServiceTiming(service.durationMinutes, service.bufferMinutes, locale)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">{t(locale, "common.price")}</dt>
                <dd className="font-semibold">{formatMoney(service.priceCents, locale)}</dd>
              </div>
            </dl>
            <Link
              href={`/book?service=${service.slug}`}
              className="brand-accent-fill mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold transition"
            >
              {t(locale, "public.services.bookService", { serviceName: service.name })}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-border bg-card/90 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.services.availableStaff")}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {business.staffMembers.map((staffMember) => (
            <article key={staffMember.id} className="rounded-[1.5rem] bg-surface p-5">
              <h2 className="font-display text-2xl">{staffMember.name}</h2>
              <p className="mt-2 text-sm font-semibold text-accent">{staffMember.title}</p>
              <p className="mt-3 text-sm leading-7 text-muted">{staffMember.bio}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
