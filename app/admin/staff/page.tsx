import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import StaffManager from "@/app/admin/staff/staff-manager";
import { getAdminStaffMembers } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

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
        description="Search, filter, sort, and manage staff from a cleaner workspace that scales better as the team grows."
      />

      <AdminNotice notice={notice} />

      <StaffManager staffMembers={data.staffMembers} />
    </>
  );
}
