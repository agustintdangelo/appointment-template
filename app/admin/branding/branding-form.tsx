/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { upsertBrandingAction } from "@/app/admin/actions";
import {
  initialBrandingActionState,
  type BrandingActionState,
  type BrandingAssetPreview,
  type BrandingFormAsset,
} from "@/app/admin/branding/branding-types";
import {
  buildBrandingCssVariables,
  getBrandAssetFieldName,
  getBrandAssetRemoveFieldName,
  getBrandFontOptionsByCategory,
  getBrandingWarnings,
  normalizeHexColor,
  type BrandAssetKindValue,
  type BrandingSettings,
} from "@/lib/branding";

type BrandingFormProps = {
  businessName: string;
  businessDescription: string | null;
  initialBranding: BrandingSettings;
  assets: BrandingFormAsset[];
};

type FileState = Record<BrandAssetKindValue, File | null>;
type FileUrlState = Record<BrandAssetKindValue, string | null>;
type RemoveState = Record<BrandAssetKindValue, boolean>;
type PersistedAssetsState = Record<BrandAssetKindValue, BrandingAssetPreview | null>;

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

function buildPersistedAssetsState(assets: BrandingFormAsset[]): PersistedAssetsState {
  const persistedAssets: PersistedAssetsState = {
    LOGO: null,
    LOGO_ALT: null,
    FAVICON: null,
  };

  for (const asset of assets) {
    persistedAssets[asset.kind] = asset.currentAsset;
  }

  return persistedAssets;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.round(sizeBytes / 1024)} KB`;
}

function FormErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="text-sm text-rose-700">{error}</p>;
}

function WarningList({ warnings }: { warnings: ReturnType<typeof getBrandingWarnings> }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="admin-warning-banner">
      <p className="font-medium">Contrast warning</p>
      <ul className="mt-2 grid gap-2">
        {warnings.map((warning) => (
          <li key={warning.id}>{warning.message}</li>
        ))}
      </ul>
      <p className="mt-2 text-current/90">
        You can still save this branding. These warnings are guidance only.
      </p>
    </div>
  );
}

function SaveBrandingButton({
  isSaved,
}: {
  isSaved: boolean;
}) {
  const { pending } = useFormStatus();
  const buttonLabel = pending ? "Saving..." : isSaved ? "Saved" : "Save branding";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`relative inline-grid h-11 min-w-[11rem] place-items-center rounded-full px-6 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
        isSaved
          ? "bg-emerald-600 text-white hover:bg-emerald-600"
          : "bg-slate-900 text-white hover:bg-slate-800"
      }`}
    >
      <span className="invisible">Save branding</span>
      <span className="absolute inset-0 flex items-center justify-center">{buttonLabel}</span>
    </button>
  );
}

function SaveBrandingStatus({
  isSaved,
  errorMessage,
}: {
  isSaved: boolean;
  errorMessage?: string | null;
}) {
  const { pending } = useFormStatus();

  return (
    <p
      aria-live="polite"
      className={`text-sm transition-colors ${
        errorMessage ? "text-rose-700" : isSaved ? "text-emerald-700" : "text-muted"
      }`}
    >
      {errorMessage
        ? errorMessage
        : pending
          ? "Saving branding changes..."
          : isSaved
            ? "Saved. Public pages will use this branding on the next request."
            : "Saving stays on this page, so your position and preview remain in place."}
    </p>
  );
}

function getCurrentAssetUrl(
  kind: BrandAssetKindValue,
  files: FileUrlState,
  removeState: RemoveState,
  persistedAssets: PersistedAssetsState,
) {
  if (files[kind]) {
    return files[kind];
  }

  if (removeState[kind]) {
    return null;
  }

  return persistedAssets[kind]?.url ?? null;
}

export default function BrandingForm({
  businessName,
  businessDescription,
  initialBranding,
  assets,
}: BrandingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandledSuccessRef = useRef<string | null>(null);
  const [saveState, saveAction] = useActionState<BrandingActionState, FormData>(
    upsertBrandingAction,
    initialBrandingActionState,
  );
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

  useEffect(() => {
    if (saveState.status !== "success" || !saveState.savedBranding || !saveState.savedAssets) {
      return;
    }

    const successToken = JSON.stringify({
      branding: saveState.savedBranding,
      assets: saveState.savedAssets,
    });

    if (lastHandledSuccessRef.current === successToken) {
      return;
    }

    lastHandledSuccessRef.current = successToken;
    formRef.current?.reset();
  }, [saveState.savedAssets, saveState.savedBranding, saveState.status]);

  const persistedBranding = saveState.savedBranding ?? initialBranding;
  const persistedAssets = saveState.savedAssets ?? buildPersistedAssetsState(assets);

  const logoUrl = getCurrentAssetUrl("LOGO", fileUrls, removeState, persistedAssets);
  const alternateLogoUrl =
    getCurrentAssetUrl("LOGO_ALT", fileUrls, removeState, persistedAssets) ?? logoUrl;
  const faviconUrl = getCurrentAssetUrl("FAVICON", fileUrls, removeState, persistedAssets);
  const previewStyle = buildBrandingCssVariables({
    primaryFont,
    secondaryFont,
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
  });
  const contrastWarnings = getBrandingWarnings({
    primaryFont,
    secondaryFont,
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
  });
  const isDirty =
    primaryFont !== persistedBranding.primaryFont ||
    secondaryFont !== persistedBranding.secondaryFont ||
    primaryColor !== persistedBranding.primaryColor ||
    secondaryColor !== persistedBranding.secondaryColor ||
    backgroundColor !== persistedBranding.backgroundColor ||
    textColor !== persistedBranding.textColor ||
    Object.values(selectedFiles).some((file) => file !== null) ||
    Object.values(removeState).some(Boolean);
  const isSaved = saveState.status === "success" && !isDirty;

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

  function handleFormReset() {
    setSelectedFiles({ ...emptyFileState });
    setRemoveState({ ...emptyRemoveState });
    setFileUrls((currentValue) => {
      for (const url of Object.values(currentValue)) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }

      return { ...emptyFileUrlState };
    });
  }

  return (
    <form
      ref={formRef}
      action={saveAction}
      onReset={handleFormReset}
      encType="multipart/form-data"
      className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] xl:items-start"
    >
      <section className="grid gap-5">
        <div className="admin-panel p-6">
          <div className="grid gap-2 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Typography
            </p>
            <h2 className="text-xl font-semibold text-slate-900">Public font selection</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Choose the fonts used on the customer-facing site. The admin editor stays on the
              default admin typography.
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Primary font
              <select
                name="primaryFont"
                value={primaryFont}
                onChange={(event) =>
                  setPrimaryFont(event.target.value as BrandingSettings["primaryFont"])
                }
                className="admin-select"
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
              <FormErrorText error={saveState.fieldErrors.primaryFont} />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Secondary font
              <select
                name="secondaryFont"
                value={secondaryFont}
                onChange={(event) =>
                  setSecondaryFont(event.target.value as BrandingSettings["secondaryFont"])
                }
                className="admin-select"
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
              <FormErrorText error={saveState.fieldErrors.secondaryFont} />
            </label>
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="grid gap-2 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Color</p>
            <h2 className="text-xl font-semibold text-slate-900">Theme colors</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              These values drive the public theme tokens. If a combination looks risky, the editor
              will warn you but it will still allow saving.
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
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
                <div className="grid gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                  <input
                    type="color"
                    value={normalizeHexColor(field.value) ?? "#000000"}
                    onChange={(event) => field.setValue(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-1 py-1"
                  />
                  <input
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.setValue(event.target.value)}
                    className="admin-input font-mono uppercase"
                  />
                </div>
                <FormErrorText error={saveState.fieldErrors[field.name]} />
              </div>
            ))}
          </div>

          <div className="mt-5">
            <WarningList warnings={contrastWarnings} />
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="grid gap-2 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Assets</p>
            <h2 className="text-xl font-semibold text-slate-900">Logos and favicon</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Uploaded files are stored with the business record and served back through the app.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            {assets.map((assetConfig) => {
              const selectedFile = selectedFiles[assetConfig.kind];
              const visiblePreview = getCurrentAssetUrl(
                assetConfig.kind,
                fileUrls,
                removeState,
                persistedAssets,
              );
              const persistedAsset = persistedAssets[assetConfig.kind];

              return (
                <div
                  key={assetConfig.kind}
                  className="admin-muted-panel p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                        {assetConfig.label}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900">
                        {assetConfig.description}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Allowed: {assetConfig.accept}. Max size:{" "}
                        {formatFileSize(assetConfig.maxSizeBytes)}.
                      </p>
                    </div>

                    <div className="w-full max-w-xs rounded-xl border border-border bg-white p-4">
                      {visiblePreview ? (
                        <div className="flex min-h-28 items-center justify-center rounded-xl bg-slate-50 p-4">
                          <img
                            src={visiblePreview}
                            alt={`${assetConfig.label} preview`}
                            className={`object-contain ${
                              assetConfig.kind === "FAVICON" ? "h-12 w-12" : "max-h-20 w-full"
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border bg-slate-50 text-sm text-muted">
                          No active asset
                        </div>
                      )}

                      <div className="mt-3 text-sm text-muted">
                        {selectedFile ? (
                          <p>Selected: {selectedFile.name}</p>
                        ) : persistedAsset ? (
                          <>
                            <p>{persistedAsset.originalFilename}</p>
                            <p>{formatFileSize(persistedAsset.sizeBytes)}</p>
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
                        }-${persistedAssets[assetConfig.kind]?.url ?? "none"}`}
                        type="file"
                        name={getBrandAssetFieldName(assetConfig.kind)}
                        accept={assetConfig.accept}
                        onChange={(event) =>
                          handleFileChange(assetConfig.kind, event.target.files?.[0] ?? null)
                        }
                        className="admin-input px-3 py-2.5 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white"
                      />
                      <FormErrorText
                        error={saveState.fieldErrors[getBrandAssetFieldName(assetConfig.kind)]}
                      />
                    </label>

                    {persistedAsset ? (
                      <label className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          name={getBrandAssetRemoveFieldName(assetConfig.kind)}
                          checked={removeState[assetConfig.kind]}
                          onChange={(event) =>
                            toggleRemove(assetConfig.kind, event.target.checked)
                          }
                          className="admin-checkbox"
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

        <div className="admin-panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <SaveBrandingButton isSaved={isSaved} />
            <SaveBrandingStatus
              isSaved={isSaved}
              errorMessage={saveState.status === "error" ? saveState.message : undefined}
            />
          </div>
        </div>
      </section>

      <aside className="xl:sticky xl:top-6">
        <div className="admin-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Preview</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Public site preview</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This preview uses the same branding tokens and logo rules as the public layout.
          </p>

          <div
            className="public-brand-shell mt-5 overflow-hidden rounded-[1.5rem] border border-border"
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
                    "Preview how your fonts, palette, and logos work together on the public site."}
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
                Dark-surface preview for footer and accent-heavy public sections.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
