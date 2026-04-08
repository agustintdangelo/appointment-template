import {
  deleteServiceAction,
  upsertServiceAction,
} from "@/app/admin/actions";
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import { formatMoney, formatServiceTiming } from "@/lib/format";
import { getAdminServices } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

function ServiceForm({
  service,
}: {
  service?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    durationMinutes: number;
    bufferMinutes: number;
    priceCents: number;
    isActive: boolean;
    sortOrder: number;
    _count?: {
      appointments: number;
    };
  };
}) {
  const canDelete = !service || (service._count?.appointments ?? 0) === 0;

  return (
    <div className="rounded-[1.75rem] border border-border bg-card/90 p-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {service ? "Edit service" : "Create service"}
        </p>
        <h2 className="font-display text-3xl">
          {service ? service.name : "Add a new service"}
        </h2>
        <p className="text-sm leading-7 text-muted">
          Keep demo copy flexible. The booking model stays generic no matter the service category.
        </p>
      </div>

      <form action={upsertServiceAction} className="mt-6 grid gap-4">
        <input type="hidden" name="serviceId" defaultValue={service?.id ?? ""} />

        <label className="grid gap-2 text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={service?.name ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input
            name="slug"
            defaultValue={service?.slug ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={4}
            defaultValue={service?.description ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Duration (minutes)
            <input
              name="durationMinutes"
              type="number"
              min="5"
              step="5"
              required
              defaultValue={service?.durationMinutes ?? 45}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Buffer (minutes)
            <input
              name="bufferMinutes"
              type="number"
              min="0"
              step="5"
              required
              defaultValue={service?.bufferMinutes ?? 0}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Price
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={service ? (service.priceCents / 100).toFixed(2) : "0.00"}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Sort order
            <input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={service?.sortOrder ?? 0}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={service ? service.isActive : true}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          Active and bookable
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
          >
            {service ? "Save service" : "Create service"}
          </button>

          {service ? (
            <button
              type="submit"
              formAction={deleteServiceAction}
              disabled={!canDelete}
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete service
            </button>
          ) : null}
        </div>

        {service && !canDelete ? (
          <p className="text-sm text-muted">
            This service already has appointments. Deactivate it instead of deleting it.
          </p>
        ) : null}
      </form>
    </div>
  );
}

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [data, notice] = await Promise.all([
    getAdminServices(),
    getAdminNotice(searchParams),
  ]);

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before managing services."
        description="The service catalog and admin management pages need the demo business record first."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin services"
        title="Manage the public service catalog."
        description="Create, update, deactivate, or remove services while keeping the booking domain reusable."
      />

      <AdminNotice notice={notice} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ServiceForm />

        <section className="grid gap-5">
          {data.services.map((service) => (
            <article key={service.id} className="grid gap-4">
              <div className="rounded-[1.5rem] bg-surface/90 px-5 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl">{service.name}</p>
                    <p className="mt-1 text-muted">
                      {formatServiceTiming(service.durationMinutes, service.bufferMinutes)} ·{" "}
                      {formatMoney(service.priceCents)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    <span>{service.isActive ? "Active" : "Inactive"}</span>
                    <span>{service._count.appointments} appointments</span>
                  </div>
                </div>
              </div>
              <ServiceForm service={service} />
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
