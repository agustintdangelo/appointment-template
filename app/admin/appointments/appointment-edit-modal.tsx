"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { updateAppointmentAction } from "@/app/admin/actions";
import { initialAdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import CreateEntityModal from "@/app/admin/components/create-entity-modal";
import { t, type AppLocale } from "@/lib/i18n";

export type EditableAppointment = {
  id: string;
  customerName: string;
  notes: string | null;
  startAt: Date;
  staffMember: {
    id: string;
  } | null;
};

export type AppointmentEditStaffOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type AppointmentEditModalProps = {
  appointment: EditableAppointment | null;
  staffMembers: AppointmentEditStaffOption[];
  businessSlug: string;
  locale: AppLocale;
  onClose: () => void;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateTimeLocalValue(date: Date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function FormErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-sm text-rose-700" role="alert">
      {error}
    </p>
  );
}

function SaveAppointmentButton({ locale }: { locale: AppLocale }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t(locale, "common.saving") : t(locale, "admin.appointments.save")}
    </button>
  );
}

function AppointmentEditForm({
  appointment,
  staffMembers,
  businessSlug,
  locale,
  onClose,
}: {
  appointment: EditableAppointment;
  staffMembers: AppointmentEditStaffOption[];
  businessSlug: string;
  locale: AppLocale;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    updateAppointmentAction,
    initialAdminEntityActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.status]);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="appointmentId" value={appointment.id} />
      <input type="hidden" name="locale" value={locale} />

      {state.status === "error" && state.message ? (
        <div className="admin-error-banner" role="alert">
          {state.message}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        {t(locale, "admin.appointments.startAtLabel")}
        <input
          type="datetime-local"
          name="startAt"
          required
          defaultValue={toDateTimeLocalValue(appointment.startAt)}
          className="admin-input"
        />
        <FormErrorText error={state.fieldErrors.startAt} />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        {t(locale, "admin.appointments.staffLabel")}
        <select
          name="staffMemberId"
          defaultValue={appointment.staffMember?.id ?? ""}
          className="admin-select"
        >
          <option value="">{t(locale, "admin.appointments.staffUnassigned")}</option>
          {staffMembers.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
              {staff.isActive ? "" : t(locale, "common.inactiveSuffix")}
            </option>
          ))}
        </select>
        <FormErrorText error={state.fieldErrors.staffMemberId} />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        {t(locale, "admin.appointments.notesLabel")}
        <textarea
          name="notes"
          rows={4}
          maxLength={500}
          placeholder={t(locale, "admin.appointments.notesPlaceholder")}
          defaultValue={appointment.notes ?? ""}
          className="admin-textarea"
        />
        <FormErrorText error={state.fieldErrors.notes} />
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <SaveAppointmentButton locale={locale} />
        <button
          type="button"
          onClick={onClose}
          className="admin-button-secondary"
        >
          {t(locale, "common.cancel")}
        </button>
      </div>
    </form>
  );
}

export default function AppointmentEditModal({
  appointment,
  staffMembers,
  businessSlug,
  locale,
  onClose,
}: AppointmentEditModalProps) {
  return (
    <CreateEntityModal
      eyebrow={t(locale, "admin.appointments.editEyebrow")}
      title={
        appointment
          ? t(locale, "admin.appointments.editTitle", {
              customerName: appointment.customerName,
            })
          : ""
      }
      description={t(locale, "admin.appointments.editDescription")}
      isOpen={appointment !== null}
      onClose={onClose}
      closeLabel={t(locale, "common.close")}
      closeAriaLabel={t(locale, "common.closeDialog")}
    >
      {appointment ? (
        <AppointmentEditForm
          key={appointment.id}
          appointment={appointment}
          staffMembers={staffMembers}
          businessSlug={businessSlug}
          locale={locale}
          onClose={onClose}
        />
      ) : null}
    </CreateEntityModal>
  );
}
