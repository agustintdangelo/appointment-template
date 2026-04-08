import Link from "next/link";

import { formatMoney, formatServiceTiming } from "@/lib/format";
import { getPrimaryBusiness } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const business = await getPrimaryBusiness();

  if (!business) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">Setup required</p>
        <h1 className="font-display text-4xl">Seed the database to load the demo business.</h1>
        <p className="text-lg text-muted">
          Run the Prisma migration and seed commands first, then refresh this page.
        </p>
      </div>
    );
  }

  const featuredServices = business.services.slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[2rem] border border-border bg-card/95 p-8 shadow-[0_30px_80px_-50px_rgba(34,29,24,0.45)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            Public booking MVP
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] sm:text-6xl">
            {business.heroHeadline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            {business.heroSubheadline}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/book"
              className="rounded-full bg-accent px-6 py-3 text-center font-semibold text-accent-foreground transition hover:bg-accent-strong"
            >
              Start booking
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-border px-6 py-3 text-center font-semibold transition hover:bg-surface"
            >
              Browse services
            </Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-border bg-surface/90 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            Template shape
          </p>
          <div className="mt-6 grid gap-5">
            <div>
              <p className="font-display text-3xl">{business.services.length}</p>
              <p className="mt-1 text-sm text-muted">active services on the public catalog</p>
            </div>
            <div>
              <p className="font-display text-3xl">{business.staffMembers.length}</p>
              <p className="mt-1 text-sm text-muted">staff members available for scheduling</p>
            </div>
            <div className="rounded-3xl bg-highlight/35 p-5">
              <p className="text-sm leading-7 text-foreground">
                Availability is generated from working hours, staff schedules, blackout dates,
                service durations, buffers, and existing appointments. No fake slots.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {featuredServices.map((service) => (
          <article
            key={service.id}
            className="rounded-[1.75rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_-45px_rgba(27,98,90,0.6)]"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-muted">Featured service</p>
            <h2 className="mt-3 font-display text-3xl">{service.name}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span>{formatServiceTiming(service.durationMinutes, service.bufferMinutes)}</span>
              <span className="font-semibold">{formatMoney(service.priceCents)}</span>
            </div>
            <Link
              href={`/book?service=${service.slug}`}
              className="mt-6 inline-flex rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-foreground"
            >
              Book this service
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-border bg-surface/90 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            What this slice includes
          </p>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-muted sm:grid-cols-2">
            <p>Public services catalog with demo content kept out of the booking engine.</p>
            <p>Live slot generation based on real schedule and blackout constraints.</p>
            <p>Booking creation with server-side validation and confirmation output.</p>
            <p>Basic admin appointment list for quick operational visibility.</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            Demo notes
          </p>
          <p className="mt-4 text-sm leading-7 text-muted">{business.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
            >
              Open booking flow
            </Link>
            <Link
              href="/admin/appointments"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
            >
              View admin list
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
