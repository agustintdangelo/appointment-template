import { redirect } from "next/navigation";

import { buildAdminBusinessPath } from "@/lib/tenant";

export default async function TenantLegacyBlackoutDatesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  redirect(buildAdminBusinessPath(businessSlug, "/calendar"));
}
