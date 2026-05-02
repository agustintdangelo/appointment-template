import {
  AdminEmptyState,
  AdminPageIntro,
} from "@/app/admin/admin-ui";
import LocalizedSection from "@/app/components/localized-section";
import { formatAppointmentDateTime } from "@/lib/format";
import { formatAppointmentBookingType, formatAppointmentStatus, t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import { getAdminAppointments } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getStatusClasses(status: string) {
  if (status === "CONFIRMED") {
    return "admin-status-badge admin-status-badge-confirmed";
  }

  if (status === "PENDING") {
    return "admin-status-badge admin-status-badge-pending";
  }

  if (status === "COMPLETED") {
    return "admin-status-badge admin-status-badge-completed";
  }

  return "admin-status-badge";
}

export default async function AdminAppointmentsPage() {
  const data = await getAdminAppointments();
  const locale = getBusinessLocale(data?.business.defaultLocale);

  if (!data) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.appointments.emptyTitle")}
        description={t(locale, "admin.noticeSeedBusiness")}
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.appointments.eyebrow")}
        title={t(locale, "admin.appointments.title", { businessName: data.business.name })}
        description={t(locale, "admin.appointments.description")}
      />

      <LocalizedSection as="section" order={2} className="admin-list-shell">
        <div className="grid grid-cols-[1.15fr_0.9fr_0.9fr_0.6fr] gap-4 border-b border-border px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          <p>{t(locale, "common.customer")}</p>
          <p>{t(locale, "common.appointment")}</p>
          <p>{t(locale, "common.staff")}</p>
          <p>{t(locale, "common.status")}</p>
        </div>

        {data.appointments.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted">
            {t(locale, "admin.appointments.noAppointments")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="grid grid-cols-1 gap-4 px-6 py-5 text-sm md:grid-cols-[1.15fr_0.9fr_0.9fr_0.6fr]"
              >
                <div>
                  <p className="font-semibold">{appointment.customerName}</p>
                  <p className="mt-1 text-muted">
                    {appointment.contactEmail ?? appointment.customerEmail}
                  </p>
                  <p className="text-muted">
                    {appointment.contactPhone ??
                      appointment.customerPhone ??
                      t(locale, "common.noPhoneProvided")}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    {t(locale, "common.bookingSource")}:{" "}
                    {formatAppointmentBookingType(appointment.bookingType, locale)}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">{appointment.service.name}</p>
                  <p className="mt-1 text-muted">
                    {formatAppointmentDateTime(appointment.startAt, locale)}
                  </p>
                  <p className="text-muted">
                    {t(locale, "common.code")}: {appointment.confirmationCode}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">
                    {appointment.staffMember?.name ?? t(locale, "common.unassigned")}
                  </p>
                  <p className="mt-1 text-muted">
                    {appointment.notes ?? t(locale, "common.noInternalNotes")}
                  </p>
                </div>

                <div>
                  <span
                    className={getStatusClasses(
                      appointment.status,
                    )}
                  >
                    {formatAppointmentStatus(appointment.status, locale)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </LocalizedSection>
    </>
  );
}
