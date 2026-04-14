/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";

import { upsertBrandingAction } from "@/app/admin/actions";
import {
  buildBrandingCssVariables,
  getBrandAssetConfigs,
  getBrandAssetFieldName,
  getBrandAssetRemoveFieldName,
  getBrandFontOptionsByCategory,
  normalizeHexColor,
  type BrandAssetKindValue,
  type BrandingSettings,
} from "@/lib/branding";

type AssetPreview = {
  kind: BrandAssetKindValue;
  label: string;
  description: string;
  accept: string;
  maxSizeBytes: number;
  currentAsset: {
    url: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  } | null;
};

type BrandingFormProps = {
  businessName: string;
  businessDescription: string | null;
  initialBranding: BrandingSettings;
  assets: AssetPreview[];
};

type FileState = Record<BrandAssetKindValue, File | null>;
type FileUrlState = Record<BrandAssetKindValue, string | null>;
type RemoveState = Record<BrandAssetKindValue, boolean>;

const emptyFileState: FileState = {
  LOGO: null,
  LOGO_ALT: null,
  FAVICON: null,
};

const emptyFileUrlState: FileUrlState = {
  LOGO: null,
  LOGO_ALT: null,
  FAVICON: null,
};

const emptyRemoveState: RemoveState = {
  LOGO: false,
  LOGO_ALT: false,
  FAVICON: false,
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.round(sizeBytes / 1024)} KB`;
}

function getCurrentAssetUrl(
  kind: BrandAssetKindValue,
  files: FileUrlState,
  removeState: RemoveState,
  currentAssets: Map<BrandAssetKindValue, AssetPreview["currentAsset"]>,
) {
  if (files[kind]) {
    return files[kind];
  }

  if (removeState[kind]) {
    return null;
  }

  return currentAssets.get(kind)?.url ?? null;
}

export default function BrandingForm({
  businessName,
  businessDescription,
  initialBranding,
  assets,
}: BrandingFormProps) {
  const [primaryFont, setPrimaryFont] = useState(initialBranding.primaryFont);
  const [secondaryFont, setSecondaryFont] = useState(initialBranding.secondaryFont);
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialBranding.secondaryColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBranding.backgroundColor);
  const [textColor, setTextColor] = useState(initialBranding.textColor);
  const [selectedFiles, setSelectedFiles] = useState<FileState>(emptyFileState);
  const [fileUrls, setFileUrls] = useState<FileUrlState>(emptyFileUrlState);
  const [removeState, setRemoveState] = useState<RemoveState>(emptyRemoveState);

  useEffect(() => {
    return () => {
      for (const url of Object.values(fileUrls)) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, [fileUrls]);

  const currentAssets = new Map<BrandAssetKindValue, AssetPreview["currentAsset"]>();

  for (const asset of assets) {
    currentAssets.set(asset.kind, asset.currentAsset);
  }
  const logoUrl = getCurrentAssetUrl("LOGO", fileUrls, removeState, currentAssets);
  const alternateLogoUrl =
    getCurrentAssetUrl("LOGO_ALT", fileUrls, removeState, currentAssets) ?? logoUrl;
  const faviconUrl = getCurrentAssetUrl("FAVICON", fileUrls, removeState, currentAssets);
  const previewStyle = buildBrandingCssVariables({
    primaryFont,
    secondaryFont,
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
  });

  function handleFileChange(kind: BrandAssetKindValue, nextFile: File | null) {
    setSelectedFiles((currentValue) => ({
      ...currentValue,
      [kind]: nextFile,
    }));
    setFileUrls((currentValue) => {
      const currentUrl = currentValue[kind];

      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return {
        ...currentValue,
        [kind]: nextFile ? URL.createObjectURL(nextFile) : null,
      };
    });

    if (nextFile) {
      setRemoveState((currentValue) => ({
        ...currentValue,
        [kind]: false,
      }));
    }
  }

  function toggleRemove(kind: BrandAssetKindValue, checked: boolean) {
    setRemoveState((currentValue) => ({
      ...currentValue,
      [kind]: checked,
    }));

    if (checked) {
      setSelectedFiles((currentValue) => ({
        ...currentValue,
        [kind]: null,
      }));
      setFileUrls((currentValue) => {
        const currentUrl = currentValue[kind];

        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }

        return {
          ...currentValue,
          [kind]: null,
        };
      });
    }
  }

  return (
    <form action={upsertBrandingAction} encType="multipart/form-data" className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] xl:items-start">
      <input type="hidden" name="redirectTo" value="/admin/branding" />

      <section className="grid gap-6">
        <div className="rounded-[2rem] border border-border bg-card/95 p-7 shadow-[0_28px_70px_-50px_rgba(34,29,24,0.45)]">
          <div className="border-b border-border pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              Typography
            </p>
            <h2 className="mt-3 font-display text-3xl">Choose the brand voice in type.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Pick a dependable primary font for interface text and a secondary font for headlines
              and moments of emphasis.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Primary font
              <select
                name="primaryFont"
                value={primaryFont}
                onChange={(event) => setPrimaryFont(event.target.value as BrandingSettings["primaryFont"])}
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              >
                {getBrandFontOptionsByCategory().map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Secondary font
              <select
                name="secondaryFont"
                value={secondaryFont}
                onChange={(event) =>
                  setSecondaryFont(event.target.value as BrandingSettings["secondaryFont"])
                }
                className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
              >
                {getBrandFontOptionsByCategory().map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/95 p-7 shadow-[0_28px_70px_-50px_rgba(34,29,24,0.45)]">
          <div className="border-b border-border pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">Color</p>
            <h2 className="mt-3 font-display text-3xl">Tune the core palette.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              The app derives surface, border, muted, and button contrast tokens from these values.
              Save-time validation blocks low-contrast combinations.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {[
              {
                label: "Primary color",
                name: "primaryColor",
                value: primaryColor,
                setValue: setPrimaryColor,
              },
              {
                label: "Secondary color",
                name: "secondaryColor",
                value: secondaryColor,
                setValue: setSecondaryColor,
              },
              {
                label: "Background color",
                name: "backgroundColor",
                value: backgroundColor,
                setValue: setBackgroundColor,
              },
              {
                label: "Text color",
                name: "textColor",
                value: textColor,
                setValue: setTextColor,
              },
            ].map((field) => (
              <div key={field.name} className="grid gap-2 text-sm font-medium">
                <span>{field.label}</span>
                <div className="grid gap-3 sm:grid-cols-[4.25rem_minmax(0,1fr)]">
                  <input
                    type="color"
                    value={normalizeHexColor(field.value) ?? "#000000"}
                    onChange={(event) => field.setValue(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-surface px-1 py-1"
                  />
                  <input
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.setValue(event.target.value)}
                    className="rounded-2xl border border-border bg-surface px-4 py-3 font-mono uppercase outline-none transition focus:border-accent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/95 p-7 shadow-[0_28px_70px_-50px_rgba(34,29,24,0.45)]">
          <div className="border-b border-border pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">Assets</p>
            <h2 className="mt-3 font-display text-3xl">Upload the brand files.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Logos and favicon are stored in the database and served through the app, so updates
              stay attached to the business configuration.
            </p>
          </div>

          <div className="mt-6 grid gap-5">
            {getBrandAssetConfigs().map((assetConfig) => {
              const asset = assets.find((entry) => entry.kind === assetConfig.kind);
              const selectedFile = selectedFiles[assetConfig.kind];
              const visiblePreview = getCurrentAssetUrl(
                assetConfig.kind,
                fileUrls,
                removeState,
                currentAssets,
              );

              return (
                <div
                  key={assetConfig.kind}
                  className="rounded-[1.5rem] border border-border bg-surface/80 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                        {assetConfig.label}
                      </p>
                      <h3 className="mt-2 font-display text-2xl">{assetConfig.description}</h3>
                      <p className="mt-2 text-sm text-muted">
                        Allowed: {assetConfig.allowedMimeTypes.join(", ")}. Max size:{" "}
                        {formatFileSize(assetConfig.maxSizeBytes)}.
                      </p>
                    </div>

                    <div className="w-full max-w-xs rounded-[1.25rem] border border-border bg-card p-4">
                      {visiblePreview ? (
                        <div className="flex min-h-28 items-center justify-center rounded-[1rem] bg-white/70 p-4">
                          <img
                            src={visiblePreview}
                            alt={`${assetConfig.label} preview`}
                            className={`object-contain ${
                              assetConfig.kind === "FAVICON"
                                ? "h-12 w-12"
                                : "max-h-20 w-full"
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="flex min-h-28 items-center justify-center rounded-[1rem] border border-dashed border-border bg-card text-sm text-muted">
                          No active asset
                        </div>
                      )}

                      <div className="mt-3 text-sm text-muted">
                        {selectedFile ? (
                          <p>Selected: {selectedFile.name}</p>
                        ) : asset?.currentAsset ? (
                          <>
                            <p>{asset.currentAsset.originalFilename}</p>
                            <p>{formatFileSize(asset.currentAsset.sizeBytes)}</p>
                          </>
                        ) : (
                          <p>No file uploaded yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="grid gap-2 text-sm font-medium">
                      Upload replacement
                      <input
                        key={`${assetConfig.kind}-${selectedFile?.name ?? "empty"}-${
                          removeState[assetConfig.kind] ? "removed" : "kept"
                        }`}
                        type="file"
                        name={getBrandAssetFieldName(assetConfig.kind)}
                        accept={assetConfig.accept}
                        onChange={(event) =>
                          handleFileChange(assetConfig.kind, event.target.files?.[0] ?? null)
                        }
                        className="brand-file-accent rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:font-semibold"
                      />
                    </label>

                    {asset?.currentAsset ? (
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          name={getBrandAssetRemoveFieldName(assetConfig.kind)}
                          checked={removeState[assetConfig.kind]}
                          onChange={(event) =>
                            toggleRemove(assetConfig.kind, event.target.checked)
                          }
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        />
                        Remove current asset
                      </label>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="brand-accent-fill rounded-full px-6 py-3 text-sm font-semibold transition"
          >
            Save branding
          </button>
          <p className="self-center text-sm text-muted">
            Changes apply to the public site immediately on the next request.
          </p>
        </div>
      </section>

      <aside className="xl:sticky xl:top-6">
        <div className="rounded-[2rem] border border-border bg-card/95 p-6 shadow-[0_28px_70px_-50px_rgba(34,29,24,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">Preview</p>
          <h2 className="mt-3 font-display text-3xl">See the active identity before saving.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            This mockup uses the same token builder as the public layout, including the light and
            dark logo surfaces.
          </p>

          <div
            className="public-brand-shell mt-6 overflow-hidden rounded-[1.75rem] border border-border"
            style={previewStyle}
          >
            <div className="border-b border-border/80 bg-surface/90 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${businessName} light logo preview`}
                      className="h-10 max-w-40 object-contain"
                    />
                  ) : (
                    <p className="font-display text-2xl leading-none">{businessName}</p>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.28em] text-muted">
                      Online appointments
                    </p>
                    <p className="truncate text-sm text-muted">Public site header</p>
                  </div>
                </div>

                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt="Favicon preview"
                    className="h-8 w-8 rounded-lg border border-border bg-card p-1"
                  />
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5">
              <section className="brand-panel-shadow rounded-[1.5rem] border border-border bg-card/95 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                  Hero
                </p>
                <h3 className="mt-3 font-display text-4xl leading-[0.95]">
                  Calm booking for clients. Clear scheduling for the team.
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted">
                  {businessDescription ??
                    "Preview how your primary and secondary fonts, palette, and logos work together."}
                </p>
                <div className="mt-5 flex gap-3">
                  <span className="brand-accent-fill rounded-full px-4 py-2 text-sm font-semibold">
                    Book now
                  </span>
                  <span className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
                    Explore services
                  </span>
                </div>
              </section>

              <section className="brand-accent-shadow rounded-[1.5rem] border border-border bg-card/92 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-muted">Service card</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl">Signature service</p>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      Preview how brand colors flow through buttons, borders, and supporting copy.
                    </p>
                  </div>
                  <span className="rounded-full border border-accent px-3 py-2 text-sm font-semibold text-accent">
                    Accent
                  </span>
                </div>
              </section>
            </div>

            <div className="brand-accent-fill px-5 py-5">
              {alternateLogoUrl ? (
                <img
                  src={alternateLogoUrl}
                  alt={`${businessName} dark logo preview`}
                  className="h-9 max-w-40 object-contain"
                />
              ) : (
                <p className="brand-on-accent font-display text-2xl leading-none">
                  {businessName}
                </p>
              )}
              <p className="brand-on-accent-muted mt-3 text-sm leading-7">
                Dark-surface preview for footer and any future accent-heavy public sections.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
