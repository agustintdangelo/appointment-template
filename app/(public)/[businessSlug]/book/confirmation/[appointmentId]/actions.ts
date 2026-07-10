"use server";

import { revalidatePath } from "next/cache";

import { cancelAppointment, type CancelAppointmentFailureReason } from "@/lib/appointments";
import { normalizeLocale, t } from "@/lib/i18n";
import { buildAdminBusinessPath, buildPublicBusinessPath } from "@/lib/tenant";
import { cancelAppointmentSchema } from "@/lib/validation";

import type { CancelAppointmentActionState } from "./cancel-appointment-button";

const FAILURE_MESSAGE_KEY: Record<CancelAppointmentFailureReason, string> = {
  "not-found": "public.confirmation.cancelNotFound",
  "already-cancelled": "public.confirmation.cancelAlreadyCancelled",
  "not-cancellable": "public.confirmation.cancelNotCancellable",
  "already-started": "public.confirmation.cancelAlreadyStarted",
};

export async function cancelAppointmentAction(
  _previousState: CancelAppointmentActionState,
  formData: FormData,
): Promise<CancelAppointmentActionState> {
  const locale = normalizeLocale(formData.get("locale"));

  try {
    const { appointmentId, businessSlug } = cancelAppointmentSchema.parse({
      appointmentId: formData.get("appointmentId"),
      businessSlug: formData.get("businessSlug"),
    });

    const result = await cancelAppointment(appointmentId, {
      businessSlug,
      allowPastStart: false,
    });

    if (!result.ok) {
      return {
        status: "error",
        message: t(locale, FAILURE_MESSAGE_KEY[result.reason]),
      };
    }

    revalidatePath(buildPublicBusinessPath(businessSlug));
    revalidatePath(buildPublicBusinessPath(businessSlug, `/book/confirmation/${appointmentId}`));
    revalidatePath(buildAdminBusinessPath(businessSlug, "/appointments"));
    revalidatePath(buildAdminBusinessPath(businessSlug, "/calendar"));

    return {
      status: "success",
      message: t(locale, "public.confirmation.cancelledMessage"),
    };
  } catch {
    return {
      status: "error",
      message: t(locale, "public.confirmation.cancelUnable"),
    };
  }
}
