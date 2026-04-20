"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { BrandingActionState } from "@/app/admin/branding/branding-types";
import type { AdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import {
  MAX_BUSINESS_PERIODS_PER_DAY,
  sortBusinessPeriods,
  validateBusinessPeriods,
} from "@/lib/business-hours";
import {
  brandFontValues,
  brandAssetKinds,
  buildBrandAssetUrl,
  getBrandAssetFieldName,
  getBrandAssetRemoveFieldName,
  isBrandFontValue,
  normalizeBrandingSettings,
  normalizeHexColor,
  readValidatedBrandAssetUpload,
} from "@/lib/branding";
import {
  getFormCheckbox,
  getFormString,
  getOptionalFormString,
  slugify,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function getAdminBusinessId() {
  const business = await prisma.business.findFirst({
    select: {
      id: true,
    },
  });

  if (!business) {
    throw new Error("Seed the database before managing records.");
  }

  return business.id;
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

function buildEntityActionState(
  status: AdminEntityActionState["status"],
  message: string | null,
  fieldErrors: Record<string, string> = {},
): AdminEntityActionState {
  return {
    status,
    message,
    fieldErrors,
  };
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

function handleEntityMutationError(
  error: unknown,
  fallbackMessage: string,
): AdminEntityActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return buildEntityActionState("error", fallbackMessage);
  }

  if (error instanceof z.ZodError) {
    return buildEntityActionState(
      "error",
      error.issues[0]?.message ?? fallbackMessage,
      buildFieldErrors(error),
    );
  }

  if (error instanceof Error) {
    return buildEntityActionState("error", error.message);
  }

  return buildEntityActionState("error", fallbackMessage);
}

function handleBrandingMutationError(
  error: unknown,
  fallbackMessage: string,
  previousState: BrandingActionState,
): BrandingActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return buildBrandingActionState(
      "error",
      fallbackMessage,
      {},
      previousState.savedBranding,
      previousState.savedAssets,
    );
  }

  if (error instanceof z.ZodError) {
    return buildBrandingActionState(
      "error",
      error.issues[0]?.message ?? fallbackMessage,
      buildFieldErrors(error),
      previousState.savedBranding,
      previousState.savedAssets,
    );
  }

  if (error instanceof Error) {
    return buildBrandingActionState(
      "error",
      error.message,
      {},
      previousState.savedBranding,
      previousState.savedAssets,
    );
  }

  return buildBrandingActionState(
    "error",
    fallbackMessage,
    {},
    previousState.savedBranding,
    previousState.savedAssets,
  );
}

function revalidateAdminPaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
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

function buildBusinessPeriodFieldErrors(
  validation: ReturnType<typeof validateBusinessPeriods>,
) {
  const fieldErrors: Record<string, string> = {};

  if (validation.formError) {
    fieldErrors.periods = validation.formError;
  }

  validation.rowErrors.forEach((rowError, index) => {
    if (rowError.openTime) {
      fieldErrors[`periods.${index}.openTime`] = rowError.openTime;
    }

    if (rowError.closeTime) {
      fieldErrors[`periods.${index}.closeTime`] = rowError.closeTime;
    }

    if (rowError.messages.length > 0) {
      fieldErrors[`periods.${index}.row`] = rowError.messages[0];
    }
  });

  return fieldErrors;
}

const serviceSchema = z.object({
  serviceId: z.string().optional(),
  name: z.string().trim().min(2, "Service name is required."),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().max(400).optional(),
  durationMinutes: z.coerce
    .number()
    .int("Duration must be a whole number.")
    .min(5, "Duration must be at least 5 minutes."),
  bufferMinutes: z.coerce
    .number()
    .int("Buffer must be a whole number.")
    .min(0, "Buffer cannot be negative."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  sortOrder: z.coerce.number().int().min(0, "Sort order cannot be negative."),
  isActive: z.boolean(),
});

const staffSchema = z.object({
  staffMemberId: z.string().optional(),
  name: z.string().trim().min(2, "Staff member name is required."),
  slug: z.string().trim().min(1).optional(),
  title: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(600).optional(),
  sortOrder: z.coerce.number().int().min(0, "Sort order cannot be negative."),
  isActive: z.boolean(),
});

const businessPeriodSchema = z.object({
  openTime: z.string(),
  closeTime: z.string(),
});

const businessHoursSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  isClosed: z.boolean(),
  periods: z
    .array(businessPeriodSchema)
    .max(
      MAX_BUSINESS_PERIODS_PER_DAY,
      `You can add up to ${MAX_BUSINESS_PERIODS_PER_DAY} Business periods per day.`,
    ),
  copyToDayOfWeek: z.array(z.coerce.number().int().min(0).max(6)).default([]),
});

const blackoutSchema = z
  .object({
    blackoutDateId: z.string().optional(),
    staffMemberId: z.string().optional(),
    startsAt: z.string().min(1, "Start time is required."),
    endsAt: z.string().min(1, "End time is required."),
    reason: z.string().trim().max(200).optional(),
  })
  .transform((value) => ({
    ...value,
    startsAtDate: new Date(value.startsAt),
    endsAtDate: new Date(value.endsAt),
  }))
  .superRefine((value, context) => {
    if (Number.isNaN(value.startsAtDate.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time is invalid.",
        path: ["startsAt"],
      });
    }

    if (Number.isNaN(value.endsAtDate.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time is invalid.",
        path: ["endsAt"],
      });
    }

    if (
      !Number.isNaN(value.startsAtDate.getTime()) &&
      !Number.isNaN(value.endsAtDate.getTime()) &&
      value.endsAtDate <= value.startsAtDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after the start time.",
        path: ["endsAt"],
      });
    }
  });

function brandFontField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => isBrandFontValue(value), {
      message: `${label} must use one of the supported fonts.`,
    })
    .transform((value) => value as (typeof brandFontValues)[number]);
}

function hexColorField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => normalizeHexColor(value) !== null, {
      message: `${label} must be a valid 6-digit hex color.`,
    })
    .transform((value) => normalizeHexColor(value) as string);
}

const brandingSchema = z.object({
  primaryFont: brandFontField("Primary font"),
  secondaryFont: brandFontField("Secondary font"),
  primaryColor: hexColorField("Primary color"),
  secondaryColor: hexColorField("Secondary color"),
  backgroundColor: hexColorField("Background color"),
  textColor: hexColorField("Text color"),
});

export async function upsertServiceAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const businessId = await getAdminBusinessId();
    const parsedInput = serviceSchema.parse({
      serviceId: getOptionalFormString(formData.get("serviceId")),
      name: getFormString(formData.get("name")),
      slug: getOptionalFormString(formData.get("slug")),
      description: getOptionalFormString(formData.get("description")),
      durationMinutes: getFormString(formData.get("durationMinutes")),
      bufferMinutes: getFormString(formData.get("bufferMinutes")),
      price: getFormString(formData.get("price")),
      sortOrder: getFormString(formData.get("sortOrder")),
      isActive: getFormCheckbox(formData, "isActive"),
    });
    const slug = parsedInput.slug || slugify(parsedInput.name);

    const duplicateService = await prisma.service.findFirst({
      where: {
        businessId,
        slug,
        NOT: parsedInput.serviceId ? { id: parsedInput.serviceId } : undefined,
      },
      select: {
        id: true,
      },
    });

    if (duplicateService) {
      return buildEntityActionState("error", "Service slug must be unique within the business.", {
        slug: "Service slug must be unique within the business.",
      });
    }

    const serviceData = {
      businessId,
      name: parsedInput.name,
      slug,
      description: parsedInput.description ?? null,
      durationMinutes: parsedInput.durationMinutes,
      bufferMinutes: parsedInput.bufferMinutes,
      priceCents: Math.round(parsedInput.price * 100),
      sortOrder: parsedInput.sortOrder,
      isActive: parsedInput.isActive,
    };

    if (parsedInput.serviceId) {
      await prisma.service.update({
        where: {
          id: parsedInput.serviceId,
        },
        data: serviceData,
      });
    } else {
      await prisma.service.create({
        data: serviceData,
      });
    }

    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin/services",
      "/admin/appointments",
    ]);
    return buildEntityActionState("success", "Service saved.");
  } catch (error) {
    return handleEntityMutationError(error, "Unable to save the service.");
  }
}

export async function deleteServiceAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const serviceId = getFormString(formData.get("serviceId"));

    if (!serviceId) {
      return buildEntityActionState("error", "Service id is missing.");
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        serviceId,
      },
    });

    if (linkedAppointments > 0) {
      return buildEntityActionState(
        "error",
        "Services with appointments cannot be deleted. Deactivate them instead.",
      );
    }

    await prisma.service.delete({
      where: {
        id: serviceId,
      },
    });

    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin/services",
      "/admin/appointments",
    ]);
    return buildEntityActionState("success", "Service deleted.");
  } catch (error) {
    return handleEntityMutationError(error, "Unable to delete the service.");
  }
}

export async function upsertStaffMemberAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const businessId = await getAdminBusinessId();
    const parsedInput = staffSchema.parse({
      staffMemberId: getOptionalFormString(formData.get("staffMemberId")),
      name: getFormString(formData.get("name")),
      slug: getOptionalFormString(formData.get("slug")),
      title: getOptionalFormString(formData.get("title")),
      bio: getOptionalFormString(formData.get("bio")),
      sortOrder: getFormString(formData.get("sortOrder")),
      isActive: getFormCheckbox(formData, "isActive"),
    });
    const slug = parsedInput.slug || slugify(parsedInput.name);

    const duplicateStaffMember = await prisma.staffMember.findFirst({
      where: {
        businessId,
        slug,
        NOT: parsedInput.staffMemberId ? { id: parsedInput.staffMemberId } : undefined,
      },
      select: {
        id: true,
      },
    });

    if (duplicateStaffMember) {
      return buildEntityActionState("error", "Staff slug must be unique within the business.", {
        slug: "Staff slug must be unique within the business.",
      });
    }

    const staffMemberData = {
      businessId,
      name: parsedInput.name,
      slug,
      title: parsedInput.title ?? null,
      bio: parsedInput.bio ?? null,
      sortOrder: parsedInput.sortOrder,
      isActive: parsedInput.isActive,
    };

    if (parsedInput.staffMemberId) {
      await prisma.staffMember.update({
        where: {
          id: parsedInput.staffMemberId,
        },
        data: staffMemberData,
      });
    } else {
      await prisma.staffMember.create({
        data: staffMemberData,
      });
    }

    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin/staff",
      "/admin/appointments",
      "/admin/calendar",
    ]);
    return buildEntityActionState("success", "Staff member saved.");
  } catch (error) {
    return handleEntityMutationError(error, "Unable to save the staff member.");
  }
}

export async function deleteStaffMemberAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const staffMemberId = getFormString(formData.get("staffMemberId"));

    if (!staffMemberId) {
      return buildEntityActionState("error", "Staff member id is missing.");
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        staffMemberId,
      },
    });

    if (linkedAppointments > 0) {
      return buildEntityActionState(
        "error",
        "Staff with appointments cannot be deleted. Deactivate them instead.",
      );
    }

    await prisma.staffMember.delete({
      where: {
        id: staffMemberId,
      },
    });

    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin/staff",
      "/admin/appointments",
      "/admin/calendar",
    ]);
    return buildEntityActionState("success", "Staff member deleted.");
  } catch (error) {
    return handleEntityMutationError(error, "Unable to delete the staff member.");
  }
}

export async function upsertBusinessHoursAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const businessId = await getAdminBusinessId();
    const openTimes = formData.getAll("openTime").map((value) => getFormString(value));
    const closeTimes = formData.getAll("closeTime").map((value) => getFormString(value));
    const periods = openTimes.map((openTime, index) => ({
      openTime,
      closeTime: closeTimes[index] ?? "",
    }));
    const parsedInput = businessHoursSchema.parse({
      dayOfWeek: getFormString(formData.get("dayOfWeek")),
      isClosed: getFormCheckbox(formData, "isClosed"),
      periods,
      copyToDayOfWeek: formData
        .getAll("copyToDayOfWeek")
        .map((value) => getFormString(value))
        .filter(Boolean),
    });
    const validatedPeriods = validateBusinessPeriods({
      periods: parsedInput.periods,
      isClosed: parsedInput.isClosed,
    });

    if (validatedPeriods.hasErrors) {
      const fieldErrors = buildBusinessPeriodFieldErrors(validatedPeriods);

      return buildEntityActionState(
        "error",
        validatedPeriods.formError ?? Object.values(fieldErrors)[0] ?? "Unable to update business hours.",
        fieldErrors,
      );
    }

    const copyToDayOfWeek = [...new Set(parsedInput.copyToDayOfWeek)].filter(
      (dayOfWeek) => dayOfWeek !== parsedInput.dayOfWeek,
    );

    if (copyToDayOfWeek.length > 0 && (parsedInput.isClosed || validatedPeriods.sortedPeriods.length === 0)) {
      return buildEntityActionState("error", "Copying Business periods requires at least 1 active Business period.", {
        copyToDayOfWeek:
          "Reopen this day and keep at least 1 valid Business period before copying to other days.",
      });
    }

    const sortedPeriods = sortBusinessPeriods(validatedPeriods.sortedPeriods);

    await prisma.$transaction(async (transaction) => {
      const daysToReplace = [parsedInput.dayOfWeek, ...copyToDayOfWeek];

      await Promise.all(
        daysToReplace.map((dayOfWeek) =>
          transaction.businessHoursDay.upsert({
            where: {
              businessId_dayOfWeek: {
                businessId,
                dayOfWeek,
              },
            },
            update: {
              isClosed: dayOfWeek === parsedInput.dayOfWeek ? parsedInput.isClosed : false,
            },
            create: {
              businessId,
              dayOfWeek,
              isClosed: dayOfWeek === parsedInput.dayOfWeek ? parsedInput.isClosed : false,
            },
          }),
        ),
      );

      await transaction.businessHours.deleteMany({
        where: {
          businessId,
          dayOfWeek: {
            in: daysToReplace,
          },
        },
      });

      if (sortedPeriods.length > 0) {
        await transaction.businessHours.createMany({
          data: daysToReplace.flatMap((dayOfWeek) =>
            sortedPeriods.map((period) => ({
              businessId,
              dayOfWeek,
              openTime: period.openTime,
              closeTime: period.closeTime,
            })),
          ),
        });
      }
    });

    revalidateAdminPaths(["/admin/calendar", "/book"]);
    return buildEntityActionState(
      "success",
      copyToDayOfWeek.length > 0
        ? `Business hours updated and Business periods copied to ${copyToDayOfWeek.length} day${copyToDayOfWeek.length === 1 ? "" : "s"}.`
        : "Business hours updated.",
    );
  } catch (error) {
    return handleEntityMutationError(error, "Unable to update business hours.");
  }
}

export async function upsertBlackoutDateAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const businessId = await getAdminBusinessId();
    const parsedInput = blackoutSchema.parse({
      blackoutDateId: getOptionalFormString(formData.get("blackoutDateId")),
      staffMemberId: getOptionalFormString(formData.get("staffMemberId")),
      startsAt: getFormString(formData.get("startsAt")),
      endsAt: getFormString(formData.get("endsAt")),
      reason: getOptionalFormString(formData.get("reason")),
    });

    const blackoutData = {
      businessId,
      staffMemberId: parsedInput.staffMemberId ?? null,
      startsAt: parsedInput.startsAtDate,
      endsAt: parsedInput.endsAtDate,
      reason: parsedInput.reason ?? null,
    };

    if (parsedInput.blackoutDateId) {
      await prisma.blackoutDate.update({
        where: {
          id: parsedInput.blackoutDateId,
        },
        data: blackoutData,
      });
    } else {
      await prisma.blackoutDate.create({
        data: blackoutData,
      });
    }

    revalidateAdminPaths(["/admin/calendar", "/book"]);
    return buildEntityActionState("success", "Blackout block saved.");
  } catch (error) {
    return handleEntityMutationError(error, "Unable to save the blackout date.");
  }
}

export async function deleteBlackoutDateAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  try {
    const blackoutDateId = getFormString(formData.get("blackoutDateId"));

    if (!blackoutDateId) {
      return buildEntityActionState("error", "Blackout block id is missing.");
    }

    await prisma.blackoutDate.delete({
      where: {
        id: blackoutDateId,
      },
    });

    revalidateAdminPaths(["/admin/calendar", "/book"]);
    return buildEntityActionState("success", "Blackout block deleted.");
  } catch (error) {
    return handleEntityMutationError(error, "Unable to delete the blackout date.");
  }
}

export async function upsertBrandingAction(
  previousState: BrandingActionState,
  formData: FormData,
): Promise<BrandingActionState> {
  try {
    const businessId = await getAdminBusinessId();
    const parsedInput = brandingSchema.parse({
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
        );

        if (upload) {
          uploadedAssets.push(upload);
        }
      } catch (error) {
        assetFieldErrors[getBrandAssetFieldName(kind)] =
          error instanceof Error ? error.message : "Unable to read the uploaded file.";
      }
    }

    if (Object.keys(assetFieldErrors).length > 0) {
      return buildBrandingActionState(
        "error",
        "Review the highlighted branding fields.",
        assetFieldErrors,
        previousState.savedBranding,
        previousState.savedAssets,
      );
    }

    const removeKinds = brandAssetKinds.filter((kind) =>
      getFormCheckbox(formData, getBrandAssetRemoveFieldName(kind)),
    );

    const savedBranding = await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: {
          id: businessId,
        },
        data: branding,
      });

      for (const kind of removeKinds) {
        const replacementForKind = uploadedAssets.find((asset) => asset.kind === kind);

        if (!replacementForKind) {
          await tx.brandAsset.deleteMany({
            where: {
              businessId,
              kind,
            },
          });
        }
      }

      for (const asset of uploadedAssets) {
        await tx.brandAsset.upsert({
          where: {
            businessId_kind: {
              businessId,
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
            businessId,
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
          id: businessId,
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
        "Unable to load the saved branding.",
        {},
        previousState.savedBranding,
        previousState.savedAssets,
      );
    }

    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin/branding",
    ]);

    return buildBrandingActionState(
      "success",
      "Branding saved.",
      {},
      normalizeBrandingSettings(savedBranding),
      buildSavedBrandingAssets(savedBranding.brandAssets),
    );
  } catch (error) {
    return handleBrandingMutationError(error, "Unable to save branding.", previousState);
  }
}
