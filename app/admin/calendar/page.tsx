import {
  AdminEmptyState,
  AdminPageIntro,
} from "@/app/admin/admin-ui";
import CalendarManager from "@/app/admin/calendar/calendar-manager";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import { getAdminCalendar } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const data = await getAdminCalendar();
  const locale = getBusinessLocale(data?.business.defaultLocale);

  if (!data) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.calendar.emptyTitle")}
        description={t(locale, "admin.calendar.emptyDescription")}
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.calendar.eyebrow")}
        title={t(locale, "admin.calendar.title", { businessName: data.business.name })}
        description={t(locale, "admin.calendar.description")}
      />

      <CalendarManager
        businessHours={data.businessHours}
        staffMembers={data.staffMembers}
        appointments={data.appointments}
        blackoutDates={data.blackoutDates}
        locale={locale}
      />
    </>
  );
}
