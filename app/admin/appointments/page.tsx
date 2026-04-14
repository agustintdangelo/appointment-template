import {
  AdminEmptyState,
  AdminPageIntro,
} from "@/app/admin/admin-ui";
import { formatAppointmentDateTime } from "@/lib/format";
import { getAdminAppointments } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getStatusClasses(status: string) {
  if (status === "CONFIRMED") {
    return "brand-accent-fill";
  }

  if (status === "PENDING") {
    return "bg-highlight-surface text-highlight-foreground";
  }

  if (status === "COMPLETED") {
    return "bg-surface text-foreground";
  }

  return "bg-surface text-muted";
}

export default async function AdminAppointmentsPage() {
  const data = await getAdminAppointments();

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before checking appointments."
        description="The admin pages need the demo business record first."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin appointments"
        title={`${data.business.name} appointment queue`}
        description="This first operational view stays simple: upcoming appointments, customer details, service context, and status visibility."
      />

      <section className="overflow-hidden rounded-[2rem] border border-border bg-surface/95">
        <div className="grid grid-cols-[1.15fr_0.9fr_0.9fr_0.6fr] gap-4 border-b border-border px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          <p>Customer</p>
          <p>Appointment</p>
          <p>Staff</p>
          <p>Status</p>
        </div>

        {data.appointments.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted">No appointments yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {data.appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="grid grid-cols-1 gap-4 px-6 py-5 text-sm md:grid-cols-[1.15fr_0.9fr_0.9fr_0.6fr]"
              >
                <div>
                  <p className="font-semibold">{appointment.customerName}</p>
                  <p className="mt-1 text-muted">{appointment.customerEmail}</p>
                  <p className="text-muted">{appointment.customerPhone ?? "No phone provided"}</p>
                </div>

                <div>
                  <p className="font-semibold">{appointment.service.name}</p>
                  <p className="mt-1 text-muted">{formatAppointmentDateTime(appointment.startAt)}</p>
                  <p className="text-muted">Code: {appointment.confirmationCode}</p>
                </div>

                <div>
                  <p className="font-semibold">{appointment.staffMember?.name ?? "Unassigned"}</p>
                  <p className="mt-1 text-muted">{appointment.notes ?? "No internal notes"}</p>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      appointment.status,
                    )}`}
                  >
                    {appointment.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
