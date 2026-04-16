import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import ServicesManager from "@/app/admin/services/services-manager";
import { getAdminServices } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [data, notice] = await Promise.all([getAdminServices(), getAdminNotice(searchParams)]);

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before managing services."
        description="The service catalog and admin management pages need the demo business record first."
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin services"
        title="Manage the public service catalog."
        description="Search, filter, sort, and edit services from one cleaner workspace built for browsing bigger catalogs."
      />

      <AdminNotice notice={notice} />

      <ServicesManager services={data.services} />
    </>
  );
}
