"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateAppointmentStatusAction } from "@/app/admin/actions";
import { initialAdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import { t, type AppLocale } from "@/lib/i18n";

type AppointmentStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

// Sensible operational transitions. Terminal states can be reopened to
// CONFIRMED if an admin needs to correct a mistake.
const ALLOWED_TRANSITIONS: Record<AppointmentStatusValue, AppointmentStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  CANCELLED: ["CONFIRMED"],
  COMPLETED: ["CONFIRMED"],
  NO_SHOW: ["CONFIRMED"],
};

const ACTION_LABEL_KEY: Record<AppointmentStatusValue, string> = {
  PENDING: "common.statusPending",
  CONFIRMED: "common.actionConfirm",
  CANCELLED: "common.actionCancel",
  COMPLETED: "common.actionComplete",
  NO_SHOW: "common.actionNoShow",
};

function TransitionButton({
  target,
  locale,
}: {
  target: AppointmentStatusValue;
  locale: AppLocale;
}) {
  const { pending } = useFormStatus();
  const isDestructive = target === "CANCELLED";

  return (
    <button
      type="submit"
      name="status"
      value={target}
      disabled={pending}
      className={
        isDestructive
          ? "admin-button-secondary px-3 py-1 text-xs font-semibold text-red-700"
          : "admin-button-secondary px-3 py-1 text-xs font-semibold"
      }
    >
      {t(locale, ACTION_LABEL_KEY[target])}
    </button>
  );
}

export default function AppointmentStatusControls({
  appointmentId,
  currentStatus,
  businessSlug,
  locale,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatusValue;
  businessSlug: string;
  locale: AppLocale;
}) {
  const [state, formAction] = useActionState(
    updateAppointmentStatusAction,
    initialAdminEntityActionState,
  );
  const targets = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (targets.length === 0) {
    return null;
  }

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="locale" value={locale} />
      <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
        {t(locale, "common.statusActionsLabel")}
      </p>
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <TransitionButton key={target} target={target} locale={locale} />
        ))}
      </div>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
