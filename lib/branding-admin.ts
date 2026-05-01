import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import type { BrandingActionState } from "@/app/admin/branding/branding-types";
import { getFormCheckbox, getFormString } from "@/lib/admin";
import {
  brandAssetKinds,
  brandFontValues,
  buildBrandAssetUrl,
  getBrandAssetFieldName,
  getBrandAssetRemoveFieldName,
  isBrandFontValue,
  normalizeBrandingSettings,
  normalizeHexColor,
  readValidatedBrandAssetUpload,
} from "@/lib/branding";
import { DEFAULT_LOCALE, normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

function brandFontField(label: string, locale: unknown) {
  return z
    .string()
    .trim()
    .min(1, t(locale, "validation.required", { label }))
    .refine((value) => isBrandFontValue(value), {
      message: t(locale, "validation.supportedFont", { label }),
    })
    .transform((value) => value as (typeof brandFontValues)[number]);
}

function hexColorField(label: string, locale: unknown) {
  return z
    .string()
    .trim()
    .min(1, t(locale, "validation.required", { label }))
    .refine((value) => normalizeHexColor(value) !== null, {
      message: t(locale, "validation.hexColor", { label }),
    })
    .transform((value) => normalizeHexColor(value) as string);
}

function buildBrandingSchema(locale: unknown) {
  return z.object({
    primaryFont: brandFontField(t(locale, "admin.branding.primaryFont"), locale),
    secondaryFont: brandFontField(t(locale, "admin.branding.secondaryFont"), locale),
    primaryColor: hexColorField(t(locale, "admin.branding.primaryColor"), locale),
    secondaryColor: hexColorField(t(locale, "admin.branding.secondaryColor"), locale),
    backgroundColor: hexColorField(t(locale, "admin.branding.backgroundColor"), locale),
    textColor: hexColorField(t(locale, "admin.branding.textColor"), locale),
  });
}

function buildFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path
      .map((segment) => (typeof segment === "number" ? String(segment) : segment))
      .join(".");

    if (path && !fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }

  return fieldErrors;
}

function buildBrandingActionState(
  status: BrandingActionState["status"],
  message: string | null,
  fieldErrors: Record<string, string> = {},
  savedBranding: BrandingActionState["savedBranding"] = null,
  savedAssets: BrandingActionState["savedAssets"] = null,
): BrandingActionState {
  return {
    status,
    message,
    fieldErrors,
    savedBranding,
    savedAssets,
  };
}

function buildSavedBrandingAssets(
  assets: Array<{
    id: string;
    kind: "LOGO" | "LOGO_ALT" | "FAVICON";
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    updatedAt: Date;
  }>,
): NonNullable<BrandingActionState["savedAssets"]> {
  const savedAssets: NonNullable<BrandingActionState["savedAssets"]> = {
    LOGO: null,
    LOGO_ALT: null,
    FAVICON: null,
  };

  for (const asset of assets) {
    const url = buildBrandAssetUrl(asset);

    if (!url) {
      continue;
    }

    savedAssets[asset.kind] = {
      url,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    };
  }

  return savedAssets;
}

async function getCurrentBrandingSnapshot() {
  const business = await prisma.business.findFirst({
    select: {
      id: true,
      primaryFont: true,
      secondaryFont: true,
      primaryColor: true,
      secondaryColor: true,
      backgroundColor: true,
      textColor: true,
      brandAssets: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          kind: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!business) {
    return {
      businessId: null,
      savedBranding: null,
      savedAssets: null,
    };
  }

  return {
    businessId: business.id,
    savedBranding: normalizeBrandingSettings(business),
    savedAssets: buildSavedBrandingAssets(business.brandAssets),
  };
}

function handleBrandingMutationError(
  error: unknown,
  fallbackMessage: string,
  snapshot: Awaited<ReturnType<typeof getCurrentBrandingSnapshot>>,
): BrandingActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return buildBrandingActionState(
      "error",
      fallbackMessage,
      {},
      snapshot.savedBranding,
      snapshot.savedAssets,
    );
  }

  if (error instanceof z.ZodError) {
    return buildBrandingActionState(
      "error",
      error.issues[0]?.message ?? fallbackMessage,
      buildFieldErrors(error),
      snapshot.savedBranding,
      snapshot.savedAssets,
    );
  }

  if (error instanceof Error) {
    return buildBrandingActionState(
      "error",
      error.message,
      {},
      snapshot.savedBranding,
      snapshot.savedAssets,
    );
  }

  return buildBrandingActionState(
    "error",
    fallbackMessage,
    {},
    snapshot.savedBranding,
    snapshot.savedAssets,
  );
}

function revalidateBrandingPaths() {
  revalidateTag("public-branding", "max");

  for (const path of ["/", "/services", "/book", "/admin/branding"]) {
    revalidatePath(path);
  }
}

export async function saveBrandingFromFormData(formData: FormData): Promise<BrandingActionState> {
  const locale = normalizeLocale(getFormString(formData.get("locale")) || DEFAULT_LOCALE);
  const currentSnapshot = await getCurrentBrandingSnapshot();

  if (!currentSnapshot.businessId) {
    return buildBrandingActionState("error", t(locale, "actions.brandingSeed"));
  }

  try {
    const parsedInput = buildBrandingSchema(locale).parse({
      primaryFont: getFormString(formData.get("primaryFont")),
      secondaryFont: getFormString(formData.get("secondaryFont")),
      primaryColor: getFormString(formData.get("primaryColor")),
      secondaryColor: getFormString(formData.get("secondaryColor")),
      backgroundColor: getFormString(formData.get("backgroundColor")),
      textColor: getFormString(formData.get("textColor")),
    });
    const branding = normalizeBrandingSettings(parsedInput);
    const uploadedAssets: Array<
      Exclude<Awaited<ReturnType<typeof readValidatedBrandAssetUpload>>, null>
    > = [];
    const assetFieldErrors: Record<string, string> = {};

    for (const kind of brandAssetKinds) {
      try {
        const upload = await readValidatedBrandAssetUpload(
          kind,
          formData.get(getBrandAssetFieldName(kind)),
          locale,
        );

        if (upload) {
          uploadedAssets.push(upload);
        }
      } catch (error) {
        assetFieldErrors[getBrandAssetFieldName(kind)] =
          error instanceof Error ? error.message : t(locale, "actions.brandingUploadReadError");
      }
    }

    if (Object.keys(assetFieldErrors).length > 0) {
      return buildBrandingActionState(
        "error",
        t(locale, "actions.brandingReviewFields"),
        assetFieldErrors,
        currentSnapshot.savedBranding,
        currentSnapshot.savedAssets,
      );
    }

    const removeKinds = brandAssetKinds.filter((kind) =>
      getFormCheckbox(formData, getBrandAssetRemoveFieldName(kind)),
    );

    const savedBranding = await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: {
          id: currentSnapshot.businessId,
        },
        data: branding,
      });

      for (const kind of removeKinds) {
        const replacementForKind = uploadedAssets.find((asset) => asset.kind === kind);

        if (!replacementForKind) {
          await tx.brandAsset.deleteMany({
            where: {
              businessId: currentSnapshot.businessId,
              kind,
            },
          });
        }
      }

      for (const asset of uploadedAssets) {
        await tx.brandAsset.upsert({
          where: {
            businessId_kind: {
              businessId: currentSnapshot.businessId,
              kind: asset.kind,
            },
          },
          update: {
            originalFilename: asset.originalFilename,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
            data: asset.data,
          },
          create: {
            businessId: currentSnapshot.businessId,
            kind: asset.kind,
            originalFilename: asset.originalFilename,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
            data: asset.data,
          },
        });
      }

      return tx.business.findUnique({
        where: {
          id: currentSnapshot.businessId,
        },
        select: {
          primaryFont: true,
          secondaryFont: true,
          primaryColor: true,
          secondaryColor: true,
          backgroundColor: true,
          textColor: true,
          brandAssets: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              kind: true,
              originalFilename: true,
              mimeType: true,
              sizeBytes: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    if (!savedBranding) {
      return buildBrandingActionState(
        "error",
        t(locale, "actions.brandingLoadSavedError"),
        {},
        currentSnapshot.savedBranding,
        currentSnapshot.savedAssets,
      );
    }

    revalidateBrandingPaths();

    return buildBrandingActionState(
      "success",
      t(locale, "actions.brandingSaved"),
      {},
      normalizeBrandingSettings(savedBranding),
      buildSavedBrandingAssets(savedBranding.brandAssets),
    );
  } catch (error) {
    return handleBrandingMutationError(error, t(locale, "actions.brandingSaveError"), currentSnapshot);
  }
}
