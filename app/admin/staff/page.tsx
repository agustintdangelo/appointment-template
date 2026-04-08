import {
  deleteStaffMemberAction,
  upsertStaffMemberAction,
} from "@/app/admin/actions";
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import { getAdminStaffMembers } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

function StaffForm({
  staffMember,
}: {
  staffMember?: {
    id: string;
    name: string;
    slug: string;
    title: string | null;
    bio: string | null;
    isActive: boolean;
    sortOrder: number;
    _count?: {
      appointments: number;
      availabilities: number;
      blackoutDates: number;
    };
  };
}) {
  const canDelete = !staffMember || (staffMember._count?.appointments ?? 0) === 0;

  return (
    <div className="rounded-[1.75rem] border border-border bg-card/90 p-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {staffMember ? "Edit staff member" : "Create staff member"}
        </p>
        <h2 className="font-display text-3xl">
          {staffMember ? staffMember.name : "Add a team member"}
        </h2>
        <p className="text-sm leading-7 text-muted">
          Keep staff metadata generic so the same shape works for salons, spas, consultants, and
          similar businesses.
        </p>
      </div>

      <form action={upsertStaffMemberAction} className="mt-6 grid gap-4">
        <input type="hidden" name="staffMemberId" defaultValue={staffMember?.id ?? ""} />

        <label className="grid gap-2 text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={staffMember?.name ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Slug
            <input
              name="slug"
              defaultValue={staffMember?.slug ?? ""}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Title
            <input
              name="title"
              defaultValue={staffMember?.title ?? ""}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Bio
          <textarea
            name="bio"
            rows={4}
            defaultValue={staffMember?.bio ?? ""}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Sort order
            <input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={staffMember?.sortOrder ?? 0}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
          </label>

          <label className="flex items-center gap-3 self-end text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={staffMember ? staffMember.isActive : true}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            Active and assignable
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
          >
            {staffMember ? "Save staff member" : "Create staff member"}
          </button>

          {staffMember ? (
            <button
              type="submit"
              formAction={deleteStaffMemberAction}
              disabled={!canDelete}
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete staff member
            </button>
          ) : null}
        </div>

        {staffMember && !canDelete ? (
          <p className="text-sm text-muted">
            This staff member already has appointments. Deactivate them instead of deleting them.
          </p>
        ) : null}
      </form>
    </div>
  );
}

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [data, notice] = await Promise.all([
    getAdminStaffMembers(),
    getAdminNotice(searchParams),
  ]);

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before managing staff."
        description="The staff management page needs the demo business record first."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin staff"
        title="Manage the people attached to appointments."
        description="Keep staff records explicit and reusable, with presentation copy separate from scheduling rules."
      />

      <AdminNotice notice={notice} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <StaffForm />

        <section className="grid gap-5">
          {data.staffMembers.map((staffMember) => (
            <article key={staffMember.id} className="grid gap-4">
              <div className="rounded-[1.5rem] bg-surface/90 px-5 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl">{staffMember.name}</p>
                    <p className="mt-1 text-muted">{staffMember.title ?? "No title set"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    <span>{staffMember.isActive ? "Active" : "Inactive"}</span>
                    <span>{staffMember._count.appointments} appointments</span>
                    <span>{staffMember._count.blackoutDates} blackout blocks</span>
                  </div>
                </div>
              </div>
              <StaffForm staffMember={staffMember} />
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
