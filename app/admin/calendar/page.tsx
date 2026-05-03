import { redirectToPrimaryAdmin } from "@/lib/tenant-redirects";

export const dynamic = "force-dynamic";

export default async function LegacyAdminCalendarPage() {
  await redirectToPrimaryAdmin("/calendar");
}
