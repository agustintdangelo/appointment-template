import { redirectToPrimaryBusiness } from "@/lib/tenant-redirects";

export const dynamic = "force-dynamic";

export default async function LegacyBookPage() {
  await redirectToPrimaryBusiness("/book");
}
