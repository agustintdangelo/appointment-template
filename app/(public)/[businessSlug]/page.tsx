import Link from "next/link";
import { notFound } from "next/navigation";

import LocalizedSection from "@/app/components/localized-section";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getBusinessBySlug } from "@/lib/queries";
import { buildPublicBusinessPath } from "@/lib/tenant";

import BookingForm from "./book/booking-form";
import CustomerAuthProvider from "./book/customer-auth-provider";

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <LocalizedSection
        as="section"
        order={1}
        className="rounded-[2rem] border border-border bg-card/95 p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.book.eyebrow")}
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-none">
          {t(locale, "public.book.title")}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          {t(locale, "public.book.description")}
        </p>
      </LocalizedSection>

      <CustomerAuthProvider>
        <BookingForm
          business={{
            id: business.id,
            name: business.name,
            slug: business.slug,
          }}
          services={business.services}
          staffMembers={business.staffMembers}
          locale={locale}
        />
      </CustomerAuthProvider>

      <LocalizedSection as="div" order={4} className="text-sm text-muted">
        {t(locale, "public.book.manageBookingPrompt")}{" "}
        <Link
          href={buildPublicBusinessPath(business.slug, "/book/manage")}
          className="localized-action font-semibold underline underline-offset-4"
        >
          {t(locale, "public.book.manageBookingLink")}
        </Link>
      </LocalizedSection>
    </div>
  );
}
