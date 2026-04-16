import { redirect } from "next/navigation";

export default function LegacyBusinessHoursPage() {
  redirect("/admin/calendar");
}
