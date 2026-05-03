import { notFound } from "next/navigation";

import LocalizedSection from "@/app/components/localized-section";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getBusinessBySlug } from "@/lib/queries";

import BookingForm from "./booking-form";
import CustomerAuthProvider from "./customer-auth-provider";

export const dynamic = "force-dynamic";

export default async function BookPage({
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
        className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]"
      >
        <div className="rounded-[2rem] border border-border bg-card/95 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.book.eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-5xl">{t(locale, "public.book.title")}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
            {t(locale, "public.book.description")}
          </p>
        </div>

        <aside className="rounded-[2rem] border border-border bg-surface/90 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "public.book.rules")}
          </p>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-muted">
            <p>{t(locale, "public.book.ruleServiceStaff")}</p>
            <p>{t(locale, "public.book.ruleBuffers")}</p>
            <p>{t(locale, "public.book.ruleRevalidation")}</p>
          </div>
        </aside>
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
    </div>
  );
}
