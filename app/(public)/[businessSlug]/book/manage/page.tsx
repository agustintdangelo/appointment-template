import { notFound } from "next/navigation";

import LocalizedSection from "@/app/components/localized-section";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { prisma } from "@/lib/prisma";
import { normalizeBusinessSlug } from "@/lib/tenant";

import ManageBookingForm from "./manage-booking-form";

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await prisma.business.findUnique({
    where: {
      slug: normalizeBusinessSlug(businessSlug),
    },
    select: {
      defaultLocale: true,
    },
  });
  const locale = await getPublicLocale(business?.defaultLocale);

  if (!business) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <LocalizedSection
        as="section"
        order={1}
        className="rounded-[2rem] border border-border bg-surface/90 p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.manage.eyebrow")}
        </p>
        <h1 className="mt-4 font-display text-5xl">{t(locale, "public.manage.title")}</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          {t(locale, "public.manage.description")}
        </p>
      </LocalizedSection>

      <LocalizedSection as="section" order={2}>
        <ManageBookingForm businessSlug={businessSlug} locale={locale} />
      </LocalizedSection>
    </div>
  );
}
