import { getPrimaryBusiness } from "@/lib/queries";

import BookingForm from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const business = await getPrimaryBusiness();

  if (!business) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">Setup required</p>
        <h1 className="font-display text-4xl">Seed the database before opening bookings.</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-[2rem] border border-border bg-card/95 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            Booking flow
          </p>
          <h1 className="mt-4 font-display text-5xl">Select a service, staff member, and live slot.</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
            Every slot comes from real business hours, staff availability, blackout dates, and
            existing appointments.
          </p>
        </div>

        <aside className="rounded-[2rem] border border-border bg-surface/90 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            Booking rules
          </p>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-muted">
            <p>Choose one service and one staff member for this first MVP.</p>
            <p>Optional service buffers are enforced when generating availability.</p>
            <p>Appointments are created only after server-side revalidation of the chosen slot.</p>
          </div>
        </aside>
      </section>

      <BookingForm
        business={{
          id: business.id,
          name: business.name,
        }}
        services={business.services}
        staffMembers={business.staffMembers}
      />
    </div>
  );
}
