import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import StaffManager from "@/app/admin/staff/staff-manager";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
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
  const locale = getBusinessLocale(data?.business.defaultLocale);

  if (!data) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.staff.emptyTitle")}
        description={t(locale, "admin.staff.emptyDescription")}
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.staff.eyebrow")}
        title={t(locale, "admin.staff.title")}
        description={t(locale, "admin.staff.description")}
      />

      <AdminNotice notice={notice} />

      <StaffManager staffMembers={data.staffMembers} locale={locale} />
    </>
  );
}
