import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeBusinessSlug } from "@/lib/tenant";

type CancelAppointmentOptions = {
  businessSlug?: string;
  allowPastStart?: boolean;
};

export type CancelAppointmentFailureReason =
  | "not-found"
  | "already-cancelled"
  | "not-cancellable"
  | "already-started";

export type CancelAppointmentResult =
  | { ok: true }
  | { ok: false; reason: CancelAppointmentFailureReason };

export function isAppointmentCancellableOnline(appointment: {
  status: AppointmentStatus;
  startAt: Date;
}) {
  return (
    (appointment.status === AppointmentStatus.PENDING ||
      appointment.status === AppointmentStatus.CONFIRMED) &&
    appointment.startAt.getTime() > Date.now()
  );
}

/**
 * Shared cancellation core for the customer-facing flows. Scoped by business
 * slug so a tenant's appointment can only be cancelled through its own pages,
 * and guarded so only upcoming PENDING/CONFIRMED appointments can be cancelled
 * online. Admins use updateAppointmentStatusAction, which allows the full
 * status-transition matrix; both paths end in the same CANCELLED status that
 * availability already excludes, so cancelling frees the slot.
 */
export async function cancelAppointment(
  appointmentId: string,
  options: CancelAppointmentOptions = {},
): Promise<CancelAppointmentResult> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      business: options.businessSlug
        ? {
            slug: normalizeBusinessSlug(options.businessSlug),
          }
        : undefined,
    },
    select: {
      id: true,
      status: true,
      startAt: true,
    },
  });

  if (!appointment) {
    return { ok: false, reason: "not-found" };
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    return { ok: false, reason: "already-cancelled" };
  }

  if (
    appointment.status !== AppointmentStatus.PENDING &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    return { ok: false, reason: "not-cancellable" };
  }

  if (!options.allowPastStart && appointment.startAt.getTime() <= Date.now()) {
    return { ok: false, reason: "already-started" };
  }

  await prisma.appointment.update({
    where: {
      id: appointment.id,
    },
    data: {
      status: AppointmentStatus.CANCELLED,
    },
  });

  return { ok: true };
}
