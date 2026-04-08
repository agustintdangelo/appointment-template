import Link from "next/link";

import { formatMoney, formatServiceTiming } from "@/lib/format";
import { getPrimaryBusiness } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const business = await getPrimaryBusiness();

  if (!business) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">No catalog loaded</p>
        <h1 className="font-display text-4xl">Seed the database to see demo services.</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border bg-card/95 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Services
        </p>
        <h1 className="mt-4 font-display text-5xl">Choose a service, then lock in a real slot.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          This page is seeded with a nail studio demo, but the service model stays generic enough
          for any business that sells bookable time.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {business.services.map((service) => (
          <article
            key={service.id}
            className="rounded-[1.75rem] border border-border bg-surface/95 p-6 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.55)]"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-muted">Service</p>
            <h2 className="mt-3 font-display text-3xl">{service.name}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{service.description}</p>
            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Timing</dt>
                <dd>{formatServiceTiming(service.durationMinutes, service.bufferMinutes)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Price</dt>
                <dd className="font-semibold">{formatMoney(service.priceCents)}</dd>
              </div>
            </dl>
            <Link
              href={`/book?service=${service.slug}`}
              className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
            >
              Book {service.name}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-border bg-card/90 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Available staff
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {business.staffMembers.map((staffMember) => (
            <article key={staffMember.id} className="rounded-[1.5rem] bg-surface p-5">
              <h2 className="font-display text-2xl">{staffMember.name}</h2>
              <p className="mt-2 text-sm font-semibold text-accent">{staffMember.title}</p>
              <p className="mt-3 text-sm leading-7 text-muted">{staffMember.bio}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
