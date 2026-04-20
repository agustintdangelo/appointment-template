import type { BrandingFormAsset } from "@/app/admin/branding/branding-types";
import { AdminEmptyState, AdminPageIntro } from "@/app/admin/admin-ui";
import BrandingForm from "@/app/admin/branding/branding-form";
import {
  buildBrandAssetUrl,
  getBrandAssetConfigs,
  normalizeBrandingSettings,
} from "@/lib/branding";
import { getAdminBranding } from "@/lib/queries";

export default async function AdminBrandingPage() {
  const data = await getAdminBranding();

  if (!data) {
    return (
      <AdminEmptyState
        title="Seed the database before customizing branding."
        description="The branding workspace needs the demo business record first."
      />
    );
  }

  const assets = data.brandAssets.map((asset) => ({
    ...asset,
    url: buildBrandAssetUrl(asset) ?? "",
  }));
  const assetsByKind = new Map(assets.map((asset) => [asset.kind, asset]));
  const formAssets: BrandingFormAsset[] = getBrandAssetConfigs().map((config) => ({
    ...config,
    currentAsset: assetsByKind.get(config.kind) ?? null,
  }));

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin branding"
        title="Public branding"
        description="Manage the public site's fonts, colors, logos, and favicon here. The editor stays neutral so you can review branding choices without styling the admin workspace itself."
      />

      <BrandingForm
        businessName={data.name}
        businessDescription={data.description}
        initialBranding={normalizeBrandingSettings(data)}
        assets={formAssets}
      />
    </>
  );
}
