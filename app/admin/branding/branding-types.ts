import type { BrandAssetKindValue, BrandingSettings } from "@/lib/branding";

export type BrandingAssetPreview = {
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type BrandingFormAsset = {
  kind: BrandAssetKindValue;
  label: string;
  description: string;
  accept: string;
  maxSizeBytes: number;
  currentAsset: BrandingAssetPreview | null;
};

export type BrandingActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
  savedBranding: BrandingSettings | null;
  savedAssets: Record<BrandAssetKindValue, BrandingAssetPreview | null> | null;
};

export const initialBrandingActionState: BrandingActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  savedBranding: null,
  savedAssets: null,
};
