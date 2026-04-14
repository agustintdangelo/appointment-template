import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAppointmentDateTime, formatMoney, formatServiceTiming } from "@/lib/format";
import { getAppointmentConfirmation } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const appointment = await getAppointmentConfirmation(appointmentId);

  if (!appointment) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border bg-card/95 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Booking confirmed
        </p>
        <h1 className="mt-4 font-display text-5xl">Your appointment is in the schedule.</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          Save the confirmation code for any future edits or support conversations.
        </p>
        <div className="brand-accent-fill mt-6 inline-flex rounded-full px-5 py-2 text-sm font-semibold">
          Confirmation code: {appointment.confirmationCode}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-[1.75rem] border border-border bg-surface/95 p-6">
          <h2 className="font-display text-3xl">Appointment details</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Guest</dt>
              <dd>{appointment.customerName}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Email</dt>
              <dd>{appointment.customerEmail}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Phone</dt>
              <dd>{appointment.customerPhone ?? "Not provided"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Status</dt>
              <dd>{appointment.status}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Starts</dt>
              <dd>{formatAppointmentDateTime(appointment.startAt)}</dd>
            </div>
          </dl>
          {appointment.notes ? (
            <p className="mt-5 rounded-[1.25rem] bg-card px-4 py-3 text-sm leading-7 text-muted">
              {appointment.notes}
            </p>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-border bg-surface/95 p-6">
          <h2 className="font-display text-3xl">Service details</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Service</dt>
              <dd>{appointment.service.name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Timing</dt>
              <dd>
                {formatServiceTiming(
                  appointment.service.durationMinutes,
                  appointment.service.bufferMinutes,
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Price</dt>
              <dd>{formatMoney(appointment.service.priceCents)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Staff</dt>
              <dd>{appointment.staffMember?.name ?? "Unassigned"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Contact</dt>
              <dd>{appointment.business.phone ?? appointment.business.email ?? "Front desk"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/book"
          className="brand-accent-fill rounded-full px-5 py-3 font-semibold transition"
        >
          Book another appointment
        </Link>
        <Link
          href="/admin/appointments"
          className="rounded-full border border-border px-5 py-3 font-semibold transition hover:bg-surface"
        >
          Open admin list
        </Link>
      </div>
    </div>
  );
}
