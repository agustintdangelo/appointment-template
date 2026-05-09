import { redirect } from "next/navigation";

import { buildPublicBusinessPath } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const service = resolvedSearchParams.service;
  const serviceSlug = Array.isArray(service) ? service[0] : service;
  const query = serviceSlug ? `?service=${encodeURIComponent(serviceSlug)}` : "";

  redirect(`${buildPublicBusinessPath(businessSlug)}${query}`);
}
