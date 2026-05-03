import type { BrandingFormAsset } from "@/app/admin/branding/branding-types";
import { AdminEmptyState, AdminPageIntro } from "@/app/admin/admin-ui";
import BrandingForm from "@/app/admin/branding/branding-form";
import {
  buildBrandAssetUrl,
  getBrandAssetConfigs,
  normalizeBrandingSettings,
} from "@/lib/branding";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import { getAdminBranding } from "@/lib/queries";

export default async function AdminBrandingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const data = await getAdminBranding(businessSlug);
  const locale = getBusinessLocale(data?.defaultLocale);

  if (!data) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.branding.emptyTitle")}
        description={t(locale, "admin.branding.emptyDescription")}
      />
    );
  }

  const assets = data.brandAssets.map((asset) => ({
    ...asset,
    url: buildBrandAssetUrl(asset) ?? "",
  }));
  const assetsByKind = new Map(assets.map((asset) => [asset.kind, asset]));
  const formAssets: BrandingFormAsset[] = getBrandAssetConfigs(locale).map((config) => ({
    ...config,
    currentAsset: assetsByKind.get(config.kind) ?? null,
  }));

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.branding.eyebrow")}
        title={t(locale, "admin.branding.title")}
        description={t(locale, "admin.branding.description")}
      />

      <BrandingForm
        businessName={data.name}
        businessDescription={data.description}
        businessSlug={businessSlug}
        initialBranding={normalizeBrandingSettings(data)}
        assets={formAssets}
        locale={locale}
      />
    </>
  );
}
