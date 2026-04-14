"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  brandAssetKinds,
  getBrandAssetFieldName,
  getBrandAssetRemoveFieldName,
  readValidatedBrandAssetUpload,
  validateBrandingSettings,
} from "@/lib/branding";
import {
  getFormCheckbox,
  getFormString,
  getOptionalFormString,
  slugify,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function buildRedirectUrl(
  path: string,
  tone: "success" | "error",
  message: string,
) {
  const params = new URLSearchParams({
    tone,
    message,
  });

  return `${path}?${params.toString()}`;
}

function redirectWithNotice(
  path: string,
  tone: "success" | "error",
  message: string,
): never {
  redirect(buildRedirectUrl(path, tone, message));
}

async function getAdminBusinessId() {
  const business = await prisma.business.findFirst({
    select: {
      id: true,
    },
  });

  if (!business) {
    redirectWithNotice("/admin/appointments", "error", "Seed the database before managing records.");
  }

  return business.id;
}

function handleMutationError(path: string, error: unknown, fallbackMessage: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    redirectWithNotice(path, "error", fallbackMessage);
  }

  if (error instanceof z.ZodError) {
    redirectWithNotice(path, "error", error.issues[0]?.message ?? fallbackMessage);
  }

  if (error instanceof Error) {
    redirectWithNotice(path, "error", error.message);
  }

  redirectWithNotice(path, "error", fallbackMessage);
}

function revalidateAdminPaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
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

const businessHoursSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/, "Opening time must use HH:MM."),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Closing time must use HH:MM."),
    isClosed: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.isClosed && value.closeTime <= value.openTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Closing time must be after opening time.",
        path: ["closeTime"],
      });
    }
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

const brandingSchema = z.object({
  primaryFont: z.string().trim().min(1, "Primary font is required."),
  secondaryFont: z.string().trim().min(1, "Secondary font is required."),
  primaryColor: z.string().trim().min(1, "Primary color is required."),
  secondaryColor: z.string().trim().min(1, "Secondary color is required."),
  backgroundColor: z.string().trim().min(1, "Background color is required."),
  textColor: z.string().trim().min(1, "Text color is required."),
});

export async function upsertServiceAction(formData: FormData) {
  const path = "/admin/services";

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
      redirectWithNotice(path, "error", "Service slug must be unique within the business.");
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
    redirectWithNotice(path, "success", "Service saved.");
  } catch (error) {
    handleMutationError(path, error, "Unable to save the service.");
  }
}

export async function deleteServiceAction(formData: FormData) {
  const path = "/admin/services";

  try {
    const serviceId = getFormString(formData.get("serviceId"));

    if (!serviceId) {
      redirectWithNotice(path, "error", "Service id is missing.");
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        serviceId,
      },
    });

    if (linkedAppointments > 0) {
      redirectWithNotice(
        path,
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
    redirectWithNotice(path, "success", "Service deleted.");
  } catch (error) {
    handleMutationError(path, error, "Unable to delete the service.");
  }
}

export async function upsertStaffMemberAction(formData: FormData) {
  const path = "/admin/staff";

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
      redirectWithNotice(path, "error", "Staff slug must be unique within the business.");
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
      "/admin/blackout-dates",
    ]);
    redirectWithNotice(path, "success", "Staff member saved.");
  } catch (error) {
    handleMutationError(path, error, "Unable to save the staff member.");
  }
}

export async function deleteStaffMemberAction(formData: FormData) {
  const path = "/admin/staff";

  try {
    const staffMemberId = getFormString(formData.get("staffMemberId"));

    if (!staffMemberId) {
      redirectWithNotice(path, "error", "Staff member id is missing.");
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        staffMemberId,
      },
    });

    if (linkedAppointments > 0) {
      redirectWithNotice(
        path,
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
      "/admin/blackout-dates",
    ]);
    redirectWithNotice(path, "success", "Staff member deleted.");
  } catch (error) {
    handleMutationError(path, error, "Unable to delete the staff member.");
  }
}

export async function upsertBusinessHoursAction(formData: FormData) {
  const path = "/admin/business-hours";

  try {
    const businessId = await getAdminBusinessId();
    const parsedInput = businessHoursSchema.parse({
      dayOfWeek: getFormString(formData.get("dayOfWeek")),
      openTime: getFormString(formData.get("openTime")),
      closeTime: getFormString(formData.get("closeTime")),
      isClosed: getFormCheckbox(formData, "isClosed"),
    });

    await prisma.businessHours.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId,
          dayOfWeek: parsedInput.dayOfWeek,
        },
      },
      update: {
        openTime: parsedInput.openTime,
        closeTime: parsedInput.closeTime,
        isClosed: parsedInput.isClosed,
      },
      create: {
        businessId,
        dayOfWeek: parsedInput.dayOfWeek,
        openTime: parsedInput.openTime,
        closeTime: parsedInput.closeTime,
        isClosed: parsedInput.isClosed,
      },
    });

    revalidateAdminPaths(["/admin/business-hours", "/book"]);
    redirectWithNotice(path, "success", "Business hours updated.");
  } catch (error) {
    handleMutationError(path, error, "Unable to update business hours.");
  }
}

export async function upsertBlackoutDateAction(formData: FormData) {
  const path = "/admin/blackout-dates";

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

    revalidateAdminPaths(["/admin/blackout-dates", "/book"]);
    redirectWithNotice(path, "success", "Blackout date saved.");
  } catch (error) {
    handleMutationError(path, error, "Unable to save the blackout date.");
  }
}

export async function deleteBlackoutDateAction(formData: FormData) {
  const path = "/admin/blackout-dates";

  try {
    const blackoutDateId = getFormString(formData.get("blackoutDateId"));

    if (!blackoutDateId) {
      redirectWithNotice(path, "error", "Blackout date id is missing.");
    }

    await prisma.blackoutDate.delete({
      where: {
        id: blackoutDateId,
      },
    });

    revalidateAdminPaths(["/admin/blackout-dates", "/book"]);
    redirectWithNotice(path, "success", "Blackout date deleted.");
  } catch (error) {
    handleMutationError(path, error, "Unable to delete the blackout date.");
  }
}

export async function upsertBrandingAction(formData: FormData) {
  const path = "/admin/branding";

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
    const branding = validateBrandingSettings(parsedInput);
    const uploadedAssets = (
      await Promise.all(
        brandAssetKinds.map((kind) =>
          readValidatedBrandAssetUpload(kind, formData.get(getBrandAssetFieldName(kind))),
        ),
      )
    ).filter((asset) => asset !== null);
    const removeKinds = brandAssetKinds.filter((kind) =>
      getFormCheckbox(formData, getBrandAssetRemoveFieldName(kind)),
    );

    await prisma.$transaction(async (tx) => {
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
    });

    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin/branding",
    ]);
    redirectWithNotice(path, "success", "Branding saved.");
  } catch (error) {
    handleMutationError(path, error, "Unable to save branding.");
  }
}
