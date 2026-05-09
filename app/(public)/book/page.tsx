import { redirectToPrimaryBusiness } from "@/lib/tenant-redirects";

export const dynamic = "force-dynamic";

export default async function LegacyBookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const service = resolvedSearchParams.service;
  const serviceSlug = Array.isArray(service) ? service[0] : service;
  const query = serviceSlug ? `?service=${encodeURIComponent(serviceSlug)}` : "";

  await redirectToPrimaryBusiness(query);
}
