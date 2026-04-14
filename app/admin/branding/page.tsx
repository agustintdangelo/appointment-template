import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  getAdminNotice,
} from "@/app/admin/admin-ui";
import BrandingForm from "@/app/admin/branding/branding-form";
import {
  buildBrandAssetUrl,
  getBrandAssetConfigs,
  normalizeBrandingSettings,
} from "@/lib/branding";
import { getAdminBranding } from "@/lib/queries";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminBrandingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [data, notice] = await Promise.all([getAdminBranding(), getAdminNotice(searchParams)]);

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

  return (
    <>
      <AdminPageIntro
        eyebrow="Admin branding"
        title="Customize the public-facing identity."
        description="Fonts, colors, logos, and favicon all flow through one branding model so this reusable app can be adapted without touching code."
      />

      <AdminNotice notice={notice} />

      <BrandingForm
        businessName={data.name}
        businessDescription={data.description}
        initialBranding={normalizeBrandingSettings(data)}
        assets={getBrandAssetConfigs().map((config) => ({
          ...config,
          currentAsset: assetsByKind.get(config.kind) ?? null,
        }))}
      />
    </>
  );
}
