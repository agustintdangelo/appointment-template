import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import ServicesManager from "@/app/admin/services/services-manager";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import { getAdminServices } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TenantAdminServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { businessSlug } = await params;
  const [data, notice] = await Promise.all([
    getAdminServices(businessSlug),
    getAdminNotice(searchParams),
  ]);
  const locale = getBusinessLocale(data?.business.defaultLocale);

  if (!data) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.services.emptyTitle")}
        description={t(locale, "admin.services.emptyDescription")}
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.services.eyebrow")}
        title={t(locale, "admin.services.title")}
        description={t(locale, "admin.services.description")}
      />

      <AdminNotice notice={notice} />

      <ServicesManager
        businessSlug={businessSlug}
        services={data.services}
        locale={locale}
      />
    </>
  );
}
