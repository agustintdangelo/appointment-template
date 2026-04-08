import {
  deleteBlackoutDateAction,
  upsertBlackoutDateAction,
} from "@/app/admin/actions";
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import { formatBlackoutRange, getLocalDateTimeInputValue } from "@/lib/admin";
import { getAdminBlackoutDates } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

function BlackoutDateForm({
  blackoutDate,
  staffMembers,
}: {
  blackoutDate?: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    staffMemberId: string | null;
    staffMember: {
      name: string;
    } | null;
  };
  staffMembers: {
    id: string;
    name: string;
  }[];
}) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/90 p-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {blackoutDate ? "Edit blackout date" : "Create blackout date"}
        </p>
        <h2 className="font-display text-3xl">
          {blackoutDate ? "Adjust blocked time" : "Block a new time range"}
        </h2>
        <p className="text-sm leading-7 text-muted">
          Use business-wide blocks for closures and optional staff-specific blocks for exceptions.
        </p>
      </div>

      <form action={upsertBlackoutDateAction} className="mt-6 grid gap-4">
        <input type="hidden" name="blackoutDateId" defaultValue={blackoutDate?.id ?? ""} />

        <label className="grid gap-2 text-sm font-medium">
          Applies to
          <select
            name="staffMemberId"
            defaultValue={blackoutDate?.staffMemberId ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          >
            <option value="">Entire business</option>
            {staffMembers.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Starts
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={
                blackoutDate ? getLocalDateTimeInputValue(blackoutDate.startsAt) : ""
              }
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Ends
            <input
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={blackoutDate ? getLocalDateTimeInputValue(blackoutDate.endsAt) : ""}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Reason
          <input
            name="reason"
            defaultValue={blackoutDate?.reason ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
          >
            {blackoutDate ? "Save blackout" : "Create blackout"}
          </button>

          {blackoutDate ? (
            <button
              type="submit"
              formAction={deleteBlackoutDateAction}
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-surface"
            >
              Delete blackout
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default async function AdminBlackoutDatesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [data, notice] = await Promise.all([
    getAdminBlackoutDates(),
    getAdminNotice(searchParams),
  ]);

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before managing blackout dates."
        description="The blackout-management page needs the demo business record first."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin blackout dates"
        title="Block time ranges that should never appear as available."
        description="Blackout rules feed straight into availability generation for the public booking flow."
      />

      <AdminNotice notice={notice} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <BlackoutDateForm staffMembers={data.staffMembers} />

        <section className="grid gap-5">
          {data.blackoutDates.length === 0 ? (
            <AdminEmptyState
              title="No blackout dates yet."
              description="Add closures, training blocks, or business-wide exceptions here."
            />
          ) : null}

          {data.blackoutDates.map((blackoutDate) => (
            <article key={blackoutDate.id} className="grid gap-4">
              <div className="rounded-[1.5rem] bg-surface/90 px-5 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl">
                      {blackoutDate.staffMember?.name ?? "Entire business"}
                    </p>
                    <p className="mt-1 text-muted">
                      {formatBlackoutRange(blackoutDate.startsAt, blackoutDate.endsAt)}
                    </p>
                  </div>
                  <p className="text-sm text-muted">{blackoutDate.reason ?? "No reason provided"}</p>
                </div>
              </div>
              <BlackoutDateForm blackoutDate={blackoutDate} staffMembers={data.staffMembers} />
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
