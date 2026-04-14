import { upsertBusinessHoursAction } from "@/app/admin/actions";
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import { getDayLabel } from "@/lib/admin";
import { getAdminBusinessHours } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminBusinessHoursPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [data, notice] = await Promise.all([
    getAdminBusinessHours(),
    getAdminNotice(searchParams),
  ]);

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before managing business hours."
        description="The hours-management page needs the demo business record first."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin business hours"
        title="Manage the base operating schedule."
        description="This MVP keeps one primary business-hours window per day. Staff-specific schedules can layer on top in a later iteration."
      />

      <AdminNotice notice={notice} />

      <section className="grid gap-4">
        {data.businessHours.map((entry) => (
          <form
            key={entry.dayOfWeek}
            action={upsertBusinessHoursAction}
            className="grid gap-4 rounded-[1.75rem] border border-border bg-card/90 p-6 md:grid-cols-[0.8fr_1fr_1fr_0.9fr_auto]"
          >
            <input type="hidden" name="dayOfWeek" value={entry.dayOfWeek} />

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">Day</p>
              <p className="mt-2 font-display text-3xl">{getDayLabel(entry.dayOfWeek)}</p>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Opens
              <input
                name="openTime"
                type="time"
                defaultValue={entry.openTime}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Closes
              <input
                name="closeTime"
                type="time"
                defaultValue={entry.closeTime}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              />
            </label>

            <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium">
              <input
                type="checkbox"
                name="isClosed"
                defaultChecked={entry.isClosed}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              Closed all day
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="brand-accent-fill rounded-full px-5 py-3 text-sm font-semibold transition"
              >
                Save day
              </button>
            </div>
          </form>
        ))}
      </section>
    </>
  );
}
