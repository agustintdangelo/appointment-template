"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import type { BrandingActionState } from "@/app/admin/branding/branding-types";
import type { AdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import {
  MAX_BUSINESS_PERIODS_PER_DAY,
  sortBusinessPeriods,
  validateBusinessPeriods,
} from "@/lib/business-hours";
import { saveBrandingFromFormData } from "@/lib/branding-admin";
import {
  getFormCheckbox,
  getFormString,
  getOptionalFormString,
  slugify,
} from "@/lib/admin";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  normalizeLocale,
  t,
} from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

function getActionLocale(formData: FormData) {
  return normalizeLocale(getFormString(formData.get("locale")) || DEFAULT_LOCALE);
}

async function getAdminBusinessId(locale: unknown = DEFAULT_LOCALE) {
  const business = await prisma.business.findFirst({
    select: {
      id: true,
    },
  });

  if (!business) {
    throw new Error(t(locale, "actions.seedDatabase"));
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

function revalidateAdminPaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
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

function buildServiceSchema(locale: unknown) {
  return z.object({
    serviceId: z.string().optional(),
    name: z.string().trim().min(2, t(locale, "actions.serviceNameRequired")),
    slug: z.string().trim().min(1).optional(),
    description: z.string().trim().max(400).optional(),
    durationMinutes: z.coerce
      .number()
      .int(t(locale, "actions.durationWhole"))
      .min(5, t(locale, "actions.durationMin")),
    bufferMinutes: z.coerce
      .number()
      .int(t(locale, "actions.bufferWhole"))
      .min(0, t(locale, "actions.bufferNegative")),
    price: z.coerce.number().min(0, t(locale, "actions.priceNegative")),
    sortOrder: z.coerce.number().int().min(0, t(locale, "actions.sortNegative")),
    isActive: z.boolean(),
  });
}

function buildStaffSchema(locale: unknown) {
  return z.object({
    staffMemberId: z.string().optional(),
    name: z.string().trim().min(2, t(locale, "actions.staffNameRequired")),
    slug: z.string().trim().min(1).optional(),
    title: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(600).optional(),
    sortOrder: z.coerce.number().int().min(0, t(locale, "actions.sortNegative")),
    isActive: z.boolean(),
  });
}

const businessPeriodSchema = z.object({
  openTime: z.string(),
  closeTime: z.string(),
});

function buildBusinessHoursSchema(locale: unknown) {
  return z.object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    isClosed: z.boolean(),
    periods: z
      .array(businessPeriodSchema)
      .max(
        MAX_BUSINESS_PERIODS_PER_DAY,
        t(locale, "actions.businessPeriodsLimit", {
          count: MAX_BUSINESS_PERIODS_PER_DAY,
        }),
      ),
    copyToDayOfWeek: z.array(z.coerce.number().int().min(0).max(6)).default([]),
  });
}

function buildBlackoutSchema(locale: unknown) {
  return z
    .object({
      blackoutDateId: z.string().optional(),
      staffMemberId: z.string().optional(),
      startsAt: z.string().min(1, t(locale, "actions.startRequired")),
      endsAt: z.string().min(1, t(locale, "actions.endRequired")),
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
          message: t(locale, "actions.startInvalid"),
          path: ["startsAt"],
        });
      }

      if (Number.isNaN(value.endsAtDate.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t(locale, "actions.endInvalid"),
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
          message: t(locale, "actions.endAfterStart"),
          path: ["endsAt"],
        });
      }
    });
}

function buildLocalizationSchema(locale: unknown) {
  return z.object({
    defaultLocale: z.string().refine((value) => isSupportedLocale(value), {
      message: t(locale, "admin.settings.languageInvalid"),
    }),
  });
}

export async function upsertServiceAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const businessId = await getAdminBusinessId(locale);
    const parsedInput = buildServiceSchema(locale).parse({
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
      return buildEntityActionState("error", t(locale, "actions.serviceSlugUnique"), {
        slug: t(locale, "actions.serviceSlugUnique"),
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
    return buildEntityActionState("success", t(locale, "actions.serviceSaved"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.serviceSaveError"));
  }
}

export async function deleteServiceAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const serviceId = getFormString(formData.get("serviceId"));

    if (!serviceId) {
      return buildEntityActionState("error", t(locale, "actions.serviceIdMissing"));
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        serviceId,
      },
    });

    if (linkedAppointments > 0) {
      return buildEntityActionState(
        "error",
        t(locale, "actions.serviceDeleteLinked"),
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
    return buildEntityActionState("success", t(locale, "actions.serviceDeleted"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.serviceDeleteError"));
  }
}

export async function upsertStaffMemberAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const businessId = await getAdminBusinessId(locale);
    const parsedInput = buildStaffSchema(locale).parse({
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
      return buildEntityActionState("error", t(locale, "actions.staffSlugUnique"), {
        slug: t(locale, "actions.staffSlugUnique"),
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
    return buildEntityActionState("success", t(locale, "actions.staffSaved"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.staffSaveError"));
  }
}

export async function deleteStaffMemberAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const staffMemberId = getFormString(formData.get("staffMemberId"));

    if (!staffMemberId) {
      return buildEntityActionState("error", t(locale, "actions.staffIdMissing"));
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        staffMemberId,
      },
    });

    if (linkedAppointments > 0) {
      return buildEntityActionState(
        "error",
        t(locale, "actions.staffDeleteLinked"),
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
    return buildEntityActionState("success", t(locale, "actions.staffDeleted"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.staffDeleteError"));
  }
}

export async function upsertBusinessHoursAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const businessId = await getAdminBusinessId(locale);
    const openTimes = formData.getAll("openTime").map((value) => getFormString(value));
    const closeTimes = formData.getAll("closeTime").map((value) => getFormString(value));
    const periods = openTimes.map((openTime, index) => ({
      openTime,
      closeTime: closeTimes[index] ?? "",
    }));
    const parsedInput = buildBusinessHoursSchema(locale).parse({
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
      locale,
    });

    if (validatedPeriods.hasErrors) {
      const fieldErrors = buildBusinessPeriodFieldErrors(validatedPeriods);

      return buildEntityActionState(
        "error",
        validatedPeriods.formError ??
          Object.values(fieldErrors)[0] ??
          t(locale, "actions.businessHoursSaveError"),
        fieldErrors,
      );
    }

    const copyToDayOfWeek = [...new Set(parsedInput.copyToDayOfWeek)].filter(
      (dayOfWeek) => dayOfWeek !== parsedInput.dayOfWeek,
    );

    if (copyToDayOfWeek.length > 0 && (parsedInput.isClosed || validatedPeriods.sortedPeriods.length === 0)) {
      return buildEntityActionState("error", t(locale, "actions.copyRequiresPeriod"), {
        copyToDayOfWeek:
          t(locale, "actions.copyRequiresPeriodField"),
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
        ? copyToDayOfWeek.length === 1
          ? t(locale, "actions.businessHoursCopiedOne")
          : t(locale, "actions.businessHoursCopied", {
              count: copyToDayOfWeek.length,
            })
        : t(locale, "actions.businessHoursUpdated"),
    );
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.businessHoursSaveError"));
  }
}

export async function upsertBlackoutDateAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const businessId = await getAdminBusinessId(locale);
    const parsedInput = buildBlackoutSchema(locale).parse({
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
    return buildEntityActionState("success", t(locale, "actions.blackoutSaved"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.blackoutSaveError"));
  }
}

export async function deleteBlackoutDateAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const blackoutDateId = getFormString(formData.get("blackoutDateId"));

    if (!blackoutDateId) {
      return buildEntityActionState("error", t(locale, "actions.blackoutIdMissing"));
    }

    await prisma.blackoutDate.delete({
      where: {
        id: blackoutDateId,
      },
    });

    revalidateAdminPaths(["/admin/calendar", "/book"]);
    return buildEntityActionState("success", t(locale, "actions.blackoutDeleted"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.blackoutDeleteError"));
  }
}

export async function upsertBrandingAction(
  _previousState: BrandingActionState,
  formData: FormData,
): Promise<BrandingActionState> {
  return saveBrandingFromFormData(formData);
}

export async function updateDefaultLocaleAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const businessId = await getAdminBusinessId(locale);
    const parsedInput = buildLocalizationSchema(locale).parse({
      defaultLocale: getFormString(formData.get("defaultLocale")),
    });
    const nextLocale = normalizeLocale(parsedInput.defaultLocale);

    await prisma.business.update({
      where: {
        id: businessId,
      },
      data: {
        defaultLocale: nextLocale,
      },
    });

    revalidateTag("public-branding", "max");
    revalidateAdminPaths([
      "/",
      "/services",
      "/book",
      "/admin",
      "/admin/calendar",
      "/admin/appointments",
      "/admin/services",
      "/admin/staff",
      "/admin/branding",
      "/admin/settings",
    ]);

    return buildEntityActionState("success", t(nextLocale, "actions.languageSaved"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.languageSaveError"));
  }
}
