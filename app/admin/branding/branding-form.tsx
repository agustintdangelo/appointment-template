/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type {
  BrandingActionState,
  BrandingAssetPreview,
  BrandingFormAsset,
} from "@/app/admin/branding/branding-types";
import {
  buildBrandingCssVariables,
  brandAssetKinds,
  getBrandAssetFieldName,
  getBrandAssetRemoveFieldName,
  getBrandFontOptionsByCategory,
  getBrandingWarnings,
  normalizeHexColor,
  type BrandAssetKindValue,
  type BrandingSettings,
} from "@/lib/branding";
import { t, type AppLocale } from "@/lib/i18n";

type BrandingFormProps = {
  businessName: string;
  businessDescription: string | null;
  businessSlug: string;
  initialBranding: BrandingSettings;
  assets: BrandingFormAsset[];
  locale: AppLocale;
};

type FileState = Record<BrandAssetKindValue, File | null>;
type FileUrlState = Record<BrandAssetKindValue, string | null>;
type RemoveState = Record<BrandAssetKindValue, boolean>;
type FileInputVersionState = Record<BrandAssetKindValue, number>;
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

const emptyFileInputVersionState: FileInputVersionState = {
  LOGO: 0,
  LOGO_ALT: 0,
  FAVICON: 0,
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

function buildInitialSaveState(
  initialBranding: BrandingSettings,
  assets: BrandingFormAsset[],
): BrandingActionState {
  return {
    status: "idle",
    message: null,
    fieldErrors: {},
    savedBranding: initialBranding,
    savedAssets: buildPersistedAssetsState(assets),
  };
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

function WarningList({
  warnings,
  locale,
}: {
  warnings: ReturnType<typeof getBrandingWarnings>;
  locale: AppLocale;
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="admin-warning-banner">
      <p className="font-medium">{t(locale, "admin.branding.contrastWarning")}</p>
      <ul className="mt-2 grid gap-2">
        {warnings.map((warning) => (
          <li key={warning.id}>{warning.message}</li>
        ))}
      </ul>
      <p className="mt-2 text-current/90">
        {t(locale, "admin.branding.warningGuidance")}
      </p>
    </div>
  );
}

function SaveBrandingButton({
  isSaved,
  pending,
  locale,
}: {
  isSaved: boolean;
  pending: boolean;
  locale: AppLocale;
}) {
  const buttonLabel = pending
    ? t(locale, "admin.branding.saving")
    : isSaved
      ? t(locale, "admin.branding.saved")
      : t(locale, "admin.branding.saveBranding");
  const buttonState = pending ? "saving" : isSaved ? "saved" : "idle";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-state={buttonState}
      className={`relative inline-grid h-11 w-44 place-items-center rounded-full px-6 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
        isSaved
          ? "bg-emerald-600 text-white hover:bg-emerald-600"
          : "bg-slate-900 text-white hover:bg-slate-800"
      }`}
    >
      <span className="invisible">{t(locale, "admin.branding.saveBranding")}</span>
      <span className="absolute inset-0 flex items-center justify-center">{buttonLabel}</span>
    </button>
  );
}

function SaveBrandingStatus({
  isSaved,
  pending,
  errorMessage,
  locale,
}: {
  isSaved: boolean;
  pending: boolean;
  errorMessage?: string | null;
  locale: AppLocale;
}) {
  return (
    <p
      aria-live="polite"
      className={`min-h-5 max-w-[34rem] text-sm leading-5 transition-colors ${
        errorMessage ? "text-rose-700" : isSaved ? "text-emerald-700" : "text-muted"
      }`}
    >
      {errorMessage
        ? errorMessage
        : pending
          ? t(locale, "admin.branding.saving")
          : isSaved
            ? t(locale, "admin.branding.saved")
            : t(locale, "admin.branding.ready")}
    </p>
  );
}

function AssetMetadata({
  selectedFile,
  persistedAsset,
  locale,
}: {
  selectedFile: File | null;
  persistedAsset: BrandingAssetPreview | null;
  locale: AppLocale;
}) {
  return (
    <div className="mt-3 min-h-10 text-sm leading-5 text-muted">
      {selectedFile ? (
        <>
          <p className="font-medium text-slate-700">
            {t(locale, "common.selectedReplacement")}
          </p>
          <p className="truncate">{selectedFile.name}</p>
        </>
      ) : persistedAsset ? (
        <>
          <p className="truncate font-medium text-slate-700">{persistedAsset.originalFilename}</p>
          <p>{formatFileSize(persistedAsset.sizeBytes)}</p>
        </>
      ) : (
        <>
          <p className="font-medium text-slate-700">{t(locale, "common.noFileUploaded")}</p>
          <p>{t(locale, "common.noReplacementSelected")}</p>
        </>
      )}
    </div>
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

function buildErrorState(
  message: string,
  savedBranding: BrandingSettings,
  savedAssets: PersistedAssetsState,
): BrandingActionState {
  return {
    status: "error",
    message,
    fieldErrors: {},
    savedBranding,
    savedAssets,
  };
}

function hasUploadedFile(entry: FormDataEntryValue | null) {
  return entry instanceof File && entry.size > 0;
}

export default function BrandingForm({
  businessName,
  businessDescription,
  businessSlug,
  initialBranding,
  assets,
  locale,
}: BrandingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<BrandingActionState>(() =>
    buildInitialSaveState(initialBranding, assets),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primaryFont, setPrimaryFont] = useState(initialBranding.primaryFont);
  const [secondaryFont, setSecondaryFont] = useState(initialBranding.secondaryFont);
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialBranding.secondaryColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBranding.backgroundColor);
  const [textColor, setTextColor] = useState(initialBranding.textColor);
  const [selectedFiles, setSelectedFiles] = useState<FileState>(emptyFileState);
  const [fileUrls, setFileUrls] = useState<FileUrlState>(emptyFileUrlState);
  const [removeState, setRemoveState] = useState<RemoveState>(emptyRemoveState);
  const [fileInputVersions, setFileInputVersions] =
    useState<FileInputVersionState>(emptyFileInputVersionState);

  useEffect(() => {
    return () => {
      for (const url of Object.values(fileUrls)) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, [fileUrls]);

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
  }, locale);
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

  function bumpFileInputVersions(kinds: readonly BrandAssetKindValue[]) {
    setFileInputVersions((currentValue) => {
      const nextValue = { ...currentValue };

      for (const kind of kinds) {
        nextValue[kind] += 1;
      }

      return nextValue;
    });
  }

  function clearTransientFileSelections(
    kinds: readonly BrandAssetKindValue[] = brandAssetKinds,
  ) {
    setSelectedFiles((currentValue) => {
      const nextValue = { ...currentValue };

      for (const kind of kinds) {
        nextValue[kind] = null;
      }

      return nextValue;
    });

    setFileUrls((currentValue) => {
      const nextValue = { ...currentValue };

      for (const kind of kinds) {
        const currentUrl = currentValue[kind];

        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }

        nextValue[kind] = null;
      }

      return nextValue;
    });

    bumpFileInputVersions(kinds);
  }

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
      clearTransientFileSelections([kind]);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !formRef.current) {
      return;
    }

    const nextFormData = new FormData(formRef.current);
    const uploadedKinds = brandAssetKinds.filter((kind) =>
      hasUploadedFile(nextFormData.get(getBrandAssetFieldName(kind))),
    );
    const removedKinds = brandAssetKinds.filter((kind) =>
      nextFormData.get(getBrandAssetRemoveFieldName(kind)) === "on",
    );

    setIsSubmitting(true);
    setSaveState((currentValue) => ({
      ...currentValue,
      status: "idle",
      message: null,
      fieldErrors: {},
    }));

    try {
      const response = await fetch("/api/admin/branding", {
        method: "POST",
        body: nextFormData,
      });
      const result = (await response.json()) as BrandingActionState;
      const nextSavedBranding = result.savedBranding ?? persistedBranding;
      const nextSavedAssets = result.savedAssets ?? persistedAssets;

      if (result.status !== "success") {
        setSaveState({
          ...result,
          savedBranding: nextSavedBranding,
          savedAssets: nextSavedAssets,
        });
        return;
      }

      const missingUploadedKinds = uploadedKinds.filter((kind) => !nextSavedAssets[kind]);
      const staleRemovedKinds = removedKinds.filter(
        (kind) => !uploadedKinds.includes(kind) && nextSavedAssets[kind],
      );

      if (missingUploadedKinds.length > 0 || staleRemovedKinds.length > 0) {
        setSaveState(
          buildErrorState(
            t(locale, "actions.brandingPartialAssetError"),
            nextSavedBranding,
            nextSavedAssets,
          ),
        );
        return;
      }

      setPrimaryFont(nextSavedBranding.primaryFont);
      setSecondaryFont(nextSavedBranding.secondaryFont);
      setPrimaryColor(nextSavedBranding.primaryColor);
      setSecondaryColor(nextSavedBranding.secondaryColor);
      setBackgroundColor(nextSavedBranding.backgroundColor);
      setTextColor(nextSavedBranding.textColor);
      setSaveState({
        ...result,
        savedBranding: nextSavedBranding,
        savedAssets: nextSavedAssets,
      });
      clearTransientFileSelections();
      setRemoveState({ ...emptyRemoveState });
    } catch (error) {
      setSaveState(
        buildErrorState(
          error instanceof Error ? error.message : t(locale, "actions.brandingSaveError"),
          persistedBranding,
          persistedAssets,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] xl:items-start"
    >
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="locale" value={locale} />
      <section data-locale-section="" data-locale-section-order="2" className="grid gap-5">
        <div className="admin-panel p-6">
          <div className="grid gap-2 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              {t(locale, "admin.branding.typography")}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {t(locale, "admin.branding.publicFonts")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              {t(locale, "admin.branding.fontDescription")}
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {t(locale, "admin.branding.primaryFont")}
              <select
                name="primaryFont"
                value={primaryFont}
                onChange={(event) =>
                  setPrimaryFont(event.target.value as BrandingSettings["primaryFont"])
                }
                className="admin-select"
              >
                {getBrandFontOptionsByCategory(locale).map((group) => (
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
              {t(locale, "admin.branding.secondaryFont")}
              <select
                name="secondaryFont"
                value={secondaryFont}
                onChange={(event) =>
                  setSecondaryFont(event.target.value as BrandingSettings["secondaryFont"])
                }
                className="admin-select"
              >
                {getBrandFontOptionsByCategory(locale).map((group) => (
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              {t(locale, "admin.branding.color")}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {t(locale, "admin.branding.themeColors")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              {t(locale, "admin.branding.colorDescription")}
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {[
              {
                label: t(locale, "admin.branding.primaryColor"),
                name: "primaryColor",
                value: primaryColor,
                setValue: setPrimaryColor,
              },
              {
                label: t(locale, "admin.branding.secondaryColor"),
                name: "secondaryColor",
                value: secondaryColor,
                setValue: setSecondaryColor,
              },
              {
                label: t(locale, "admin.branding.backgroundColor"),
                name: "backgroundColor",
                value: backgroundColor,
                setValue: setBackgroundColor,
              },
              {
                label: t(locale, "admin.branding.textColor"),
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
            <WarningList warnings={contrastWarnings} locale={locale} />
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="grid gap-2 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              {t(locale, "admin.branding.assets")}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {t(locale, "admin.branding.logosFavicon")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              {t(locale, "admin.branding.assetsDescription")}
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
              const fileInputId = `branding-${assetConfig.kind.toLowerCase()}-upload`;

              return (
                <div key={assetConfig.kind} className="admin-muted-panel p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                        {assetConfig.label}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900">
                        {assetConfig.description}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {t(locale, "common.allowed")}: {assetConfig.accept}.{" "}
                        {t(locale, "common.maxSize")}: {formatFileSize(assetConfig.maxSizeBytes)}.
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
                          {t(locale, "common.noActiveAsset")}
                        </div>
                      )}

                      <AssetMetadata
                        selectedFile={selectedFile}
                        persistedAsset={persistedAsset}
                        locale={locale}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,16rem)] md:items-start">
                    <div className="grid gap-2 text-sm font-medium">
                      <span>{t(locale, "common.uploadReplacement")}</span>
                      <input
                        key={`${assetConfig.kind}-${fileInputVersions[assetConfig.kind]}`}
                        id={fileInputId}
                        type="file"
                        name={getBrandAssetFieldName(assetConfig.kind)}
                        accept={assetConfig.accept}
                        onChange={(event) =>
                          handleFileChange(assetConfig.kind, event.target.files?.[0] ?? null)
                        }
                        className="admin-file-input sr-only"
                      />
                      <label htmlFor={fileInputId} className="admin-file-picker">
                        <span className="admin-file-picker-action">
                          {t(locale, "common.chooseFile")}
                        </span>
                        <span className="admin-file-picker-name">
                          {selectedFile
                            ? selectedFile.name
                            : t(locale, "common.noReplacementSelected")}
                        </span>
                      </label>
                      <FormErrorText
                        error={saveState.fieldErrors[getBrandAssetFieldName(assetConfig.kind)]}
                      />
                    </div>

                    {persistedAsset ? (
                      <label className="grid gap-2 text-sm font-medium">
                        <span>{t(locale, "common.removeAsset")}</span>
                        <span
                          className="admin-remove-asset-toggle"
                          data-checked={removeState[assetConfig.kind]}
                        >
                          <input
                            type="checkbox"
                            name={getBrandAssetRemoveFieldName(assetConfig.kind)}
                            checked={removeState[assetConfig.kind]}
                            onChange={(event) =>
                              toggleRemove(assetConfig.kind, event.target.checked)
                            }
                            className="admin-checkbox shrink-0"
                          />
                          <span className="truncate">{t(locale, "common.removeCurrent")}</span>
                        </span>
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
            <SaveBrandingButton isSaved={isSaved} pending={isSubmitting} locale={locale} />
            <SaveBrandingStatus
              isSaved={isSaved}
              pending={isSubmitting}
              errorMessage={saveState.status === "error" ? saveState.message : undefined}
              locale={locale}
            />
          </div>
        </div>
      </section>

      <aside data-locale-section="" data-locale-section-order="3" className="xl:sticky xl:top-6">
        <div className="admin-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            {t(locale, "common.preview")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {t(locale, "admin.branding.publicPreview")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t(locale, "admin.branding.previewDescription")}
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
                      {t(locale, "common.onlineAppointments")}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {t(locale, "admin.branding.publicHeader")}
                    </p>
                  </div>
                </div>

                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt={`${t(locale, "branding.assets.favicon.label")} ${t(locale, "common.preview")}`}
                    className="h-8 w-8 rounded-lg border border-border bg-card p-1"
                  />
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5">
              <section className="brand-panel-shadow rounded-[1.5rem] border border-border bg-card/95 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                  {t(locale, "admin.branding.hero")}
                </p>
                <h3 className="mt-3 font-display text-4xl leading-[0.95]">
                  {t(locale, "admin.branding.previewHeadline")}
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted">
                  {businessDescription ??
                    t(locale, "admin.branding.previewFallbackDescription")}
                </p>
                <div className="mt-5 flex gap-3">
                  <span className="brand-accent-fill rounded-full px-4 py-2 text-sm font-semibold">
                    {t(locale, "admin.branding.bookNow")}
                  </span>
                  <span className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
                    {t(locale, "admin.branding.exploreServices")}
                  </span>
                </div>
              </section>

              <section className="brand-accent-shadow rounded-[1.5rem] border border-border bg-card/92 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-muted">
                  {t(locale, "admin.branding.serviceCard")}
                </p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl">
                      {t(locale, "admin.branding.signatureService")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {t(locale, "admin.branding.servicePreviewDescription")}
                    </p>
                  </div>
                  <span className="rounded-full border border-accent px-3 py-2 text-sm font-semibold text-accent">
                    {t(locale, "admin.branding.accent")}
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
                {t(locale, "admin.branding.footerPreview")}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
