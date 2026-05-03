import Link from "next/link";
import { notFound } from "next/navigation";

import LocalizedSection from "@/app/components/localized-section";
import { formatAppointmentDateTime, formatMoney, formatServiceTiming } from "@/lib/format";
import { formatAppointmentStatus, t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getAppointmentConfirmation } from "@/lib/queries";
import { buildAdminBusinessPath, buildPublicBusinessPath } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ businessSlug: string; appointmentId: string }>;
}) {
  const { businessSlug, appointmentId } = await params;
  const appointment = await getAppointmentConfirmation(appointmentId, businessSlug);
  const locale = await getPublicLocale(appointment?.business.defaultLocale);

  if (!appointment) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <LocalizedSection
        as="section"
        order={1}
        className="rounded-[2rem] border border-border bg-card/95 p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {t(locale, "public.confirmation.eyebrow")}
        </p>
        <h1 className="mt-4 font-display text-5xl">
          {t(locale, "public.confirmation.title")}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          {t(locale, "public.confirmation.description")}
        </p>
        <div className="brand-accent-fill mt-6 inline-flex rounded-full px-5 py-2 text-sm font-semibold">
          {t(locale, "public.confirmation.confirmationCode", {
            code: appointment.confirmationCode,
          })}
        </div>
      </LocalizedSection>

      <LocalizedSection as="section" order={2} className="grid gap-6 md:grid-cols-2">
        <article className="rounded-[1.75rem] border border-border bg-surface/95 p-6">
          <h2 className="font-display text-3xl">
            {t(locale, "public.confirmation.appointmentDetails")}
          </h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.guest")}</dt>
              <dd>{appointment.customerName}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.email")}</dt>
              <dd>{appointment.contactEmail ?? appointment.customerEmail}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.phone")}</dt>
              <dd>
                {appointment.contactPhone ??
                  appointment.customerPhone ??
                  t(locale, "common.notProvided")}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.status")}</dt>
              <dd>{formatAppointmentStatus(appointment.status, locale)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.starts")}</dt>
              <dd>{formatAppointmentDateTime(appointment.startAt, locale)}</dd>
            </div>
          </dl>
          {appointment.notes ? (
            <p className="mt-5 rounded-[1.25rem] bg-card px-4 py-3 text-sm leading-7 text-muted">
              {appointment.notes}
            </p>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-border bg-surface/95 p-6">
          <h2 className="font-display text-3xl">
            {t(locale, "public.confirmation.serviceDetails")}
          </h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.service")}</dt>
              <dd>{appointment.service.name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.timing")}</dt>
              <dd>
                {formatServiceTiming(
                  appointment.service.durationMinutes,
                  appointment.service.bufferMinutes,
                  locale,
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.price")}</dt>
              <dd>{formatMoney(appointment.service.priceCents, locale)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.staff")}</dt>
              <dd>{appointment.staffMember?.name ?? t(locale, "common.unassigned")}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">{t(locale, "common.contact")}</dt>
              <dd>{appointment.business.phone ?? appointment.business.email ?? t(locale, "common.frontDesk")}</dd>
            </div>
          </dl>
        </article>
      </LocalizedSection>

      <LocalizedSection as="div" order={3} className="flex flex-wrap gap-3">
        <Link
          href={buildPublicBusinessPath(businessSlug, "/book")}
          className="brand-accent-fill localized-action rounded-full px-5 py-3 font-semibold transition"
        >
          {t(locale, "public.confirmation.bookAnother")}
        </Link>
        <Link
          href={buildAdminBusinessPath(businessSlug, "/appointments")}
          className="localized-action rounded-full border border-border px-5 py-3 font-semibold transition hover:bg-surface"
        >
          {t(locale, "public.confirmation.openAdminList")}
        </Link>
      </LocalizedSection>
    </div>
  );
}
