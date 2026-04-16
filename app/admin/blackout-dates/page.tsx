import { redirect } from "next/navigation";

export default function LegacyBlackoutDatesPage() {
  redirect("/admin/calendar");
}
