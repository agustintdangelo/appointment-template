"use client";

import { useState } from "react";

import AppointmentEditModal, {
  type AppointmentEditStaffOption,
} from "@/app/admin/appointments/appointment-edit-modal";
import { formatAppointmentDateTime } from "@/lib/format";
import { formatAppointmentBookingType, formatAppointmentStatus, t, type AppLocale } from "@/lib/i18n";

type AppointmentRecord = {
  id: string;
  confirmationCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  bookingType: string;
  notes: string | null;
  status: string;
  startAt: Date;
  endAt: Date;
  service: {
    name: string;
  };
  staffMember: {
    id: string;
    name: string;
  } | null;
};

type AppointmentsListProps = {
  appointments: AppointmentRecord[];
  staffMembers: AppointmentEditStaffOption[];
  businessSlug: string;
  locale: AppLocale;
};

function getStatusClasses(status: string) {
  if (status === "CONFIRMED") return "admin-status-badge admin-status-badge-confirmed";
  if (status === "PENDING") return "admin-status-badge admin-status-badge-pending";
  if (status === "COMPLETED") return "admin-status-badge admin-status-badge-completed";
  return "admin-status-badge";
}

function EditIconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="admin-icon-button"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 16.5h3.2l8.6-8.6-3.2-3.2-8.6 8.6z" />
        <path d="m11.9 4.7 3.2 3.2" />
        <path d="M3.5 16.5h12.8" />
      </svg>
    </button>
  );
}

export default function AppointmentsList({
  appointments,
  staffMembers,
  businessSlug,
  locale,
}: AppointmentsListProps) {
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);

  return (
    <>
      <div className="divide-y divide-border">
        {appointments.map((appointment) => (
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

            <div className="flex items-start justify-between gap-3">
              <span className={getStatusClasses(appointment.status)}>
                {formatAppointmentStatus(appointment.status, locale)}
              </span>
              <EditIconButton
                label={t(locale, "admin.appointments.editLabel", {
                  customerName: appointment.customerName,
                })}
                onClick={() => setEditingAppointment(appointment)}
              />
            </div>
          </article>
        ))}
      </div>

      <AppointmentEditModal
        appointment={editingAppointment}
        staffMembers={staffMembers}
        businessSlug={businessSlug}
        locale={locale}
        onClose={() => setEditingAppointment(null)}
      />
    </>
  );
}
