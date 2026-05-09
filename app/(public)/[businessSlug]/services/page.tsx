import { redirect } from "next/navigation";

import { buildPublicBusinessPath } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  redirect(buildPublicBusinessPath(businessSlug));
}
