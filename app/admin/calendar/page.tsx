import {
  AdminEmptyState,
  AdminPageIntro,
} from "@/app/admin/admin-ui";
import CalendarManager from "@/app/admin/calendar/calendar-manager";
import { getAdminCalendar } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const data = await getAdminCalendar();

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before opening the calendar."
        description="The calendar workspace needs the demo business record before it can show appointments, schedules, and blackout dates."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin calendar"
        title={`${data.business.name} scheduling calendar`}
        description="Track appointments, compare them against unavailable time, and manage blackout rules from one shared scheduling workspace."
      />

      <CalendarManager
        businessHours={data.businessHours}
        staffMembers={data.staffMembers}
        appointments={data.appointments}
        blackoutDates={data.blackoutDates}
      />
    </>
  );
}
