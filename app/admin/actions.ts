"use server";

import { AppointmentBookingType, AppointmentStatus, Prisma } from "@prisma/client";
import { addMinutes } from "date-fns";
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
import { bookAppointmentSlot } from "@/lib/booking";
import { prepareAppointmentConfirmation } from "@/lib/confirmation";
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
import {
  buildAdminBusinessPath,
  buildPublicBusinessPath,
  normalizeBusinessSlug,
} from "@/lib/tenant";
import { adminBookingSchema } from "@/lib/validation";

function getActionLocale(formData: FormData) {
  return normalizeLocale(getFormString(formData.get("locale")) || DEFAULT_LOCALE);
}

async function getAdminBusiness(formData: FormData, locale: unknown = DEFAULT_LOCALE) {
  const businessSlug = getOptionalFormString(formData.get("businessSlug"));
  const business = await prisma.business.findFirst({
    where: businessSlug
      ? {
          slug: normalizeBusinessSlug(businessSlug),
        }
      : undefined,
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    throw new Error(t(locale, "actions.seedDatabase"));
  }

  return business;
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

function buildAppointmentFieldErrors(error: z.ZodError, locale: unknown) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (field === "customerName" && !fieldErrors.customerName) {
      fieldErrors.customerName = t(locale, "validation.fullNameRequired");
    }

    if (field === "customerEmail" && !fieldErrors.customerEmail) {
      fieldErrors.customerEmail = t(locale, "validation.emailInvalid");
    }

    if (field === "customerPhone" && !fieldErrors.customerPhone) {
      fieldErrors.customerPhone = t(locale, "validation.phoneInvalid");
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

function revalidateTenantPaths({
  businessSlug,
  publicPaths = [],
  adminPaths = [],
}: {
  businessSlug: string;
  publicPaths?: string[];
  adminPaths?: string[];
}) {
  revalidatePath("/");

  for (const path of publicPaths) {
    revalidatePath(path === "/" ? "/" : path);
    revalidatePath(buildPublicBusinessPath(businessSlug, path === "/" ? "" : path));
  }

  for (const path of adminPaths) {
    const legacyPath = path === "/" ? "/admin" : `/admin${path}`;

    revalidatePath(legacyPath);
    revalidatePath(buildAdminBusinessPath(businessSlug, path));
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
    prepMinutes: z.coerce
      .number()
      .int(t(locale, "actions.prepWhole"))
      .min(0, t(locale, "actions.prepNegative")),
    bufferMinutes: z.coerce
      .number()
      .int(t(locale, "actions.bufferWhole"))
      .min(0, t(locale, "actions.bufferNegative")),
    price: z.coerce.number().min(0, t(locale, "actions.priceNegative")),
    sortOrder: z.coerce.number().int().min(0, t(locale, "actions.sortNegative")),
    isActive: z.boolean(),
    staffMemberIds: z.array(z.string().min(1)).default([]),
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
    serviceIds: z.array(z.string().min(1)).default([]),
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

function buildStaffScheduleSchema(locale: unknown) {
  return z.object({
    staffMemberId: z.string().min(1, t(locale, "actions.staffIdMissing")),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    isOff: z.boolean(),
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
    const business = await getAdminBusiness(formData, locale);
    const parsedInput = buildServiceSchema(locale).parse({
      serviceId: getOptionalFormString(formData.get("serviceId")),
      name: getFormString(formData.get("name")),
      slug: getOptionalFormString(formData.get("slug")),
      description: getOptionalFormString(formData.get("description")),
      durationMinutes: getFormString(formData.get("durationMinutes")),
      prepMinutes: getFormString(formData.get("prepMinutes")),
      bufferMinutes: getFormString(formData.get("bufferMinutes")),
      price: getFormString(formData.get("price")),
      sortOrder: getFormString(formData.get("sortOrder")),
      isActive: getFormCheckbox(formData, "isActive"),
      staffMemberIds: formData
        .getAll("staffMemberIds")
        .map((value) => getFormString(value))
        .filter(Boolean),
    });
    const slug = parsedInput.slug || slugify(parsedInput.name);

    const duplicateService = await prisma.service.findFirst({
      where: {
        businessId: business.id,
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

    const staffMemberIds = [...new Set(parsedInput.staffMemberIds)];
    const businessStaffMembers =
      staffMemberIds.length > 0
        ? await prisma.staffMember.findMany({
            where: {
              businessId: business.id,
              id: { in: staffMemberIds },
            },
            select: { id: true },
          })
        : [];
    const validStaffMemberIds = new Set(
      businessStaffMembers.map((member) => member.id),
    );

    if (staffMemberIds.some((id) => !validStaffMemberIds.has(id))) {
      return buildEntityActionState("error", t(locale, "actions.serviceStaffInvalid"), {
        staffMemberIds: t(locale, "actions.serviceStaffInvalid"),
      });
    }

    const serviceData = {
      businessId: business.id,
      name: parsedInput.name,
      slug,
      description: parsedInput.description ?? null,
      durationMinutes: parsedInput.durationMinutes,
      prepMinutes: parsedInput.prepMinutes,
      bufferMinutes: parsedInput.bufferMinutes,
      priceCents: Math.round(parsedInput.price * 100),
      sortOrder: parsedInput.sortOrder,
      isActive: parsedInput.isActive,
    };

    if (parsedInput.serviceId) {
      const existingService = await prisma.service.findFirst({
        where: {
          id: parsedInput.serviceId,
          businessId: business.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingService) {
        return buildEntityActionState("error", t(locale, "actions.serviceIdMissing"));
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.service.update({
          where: { id: parsedInput.serviceId },
          data: serviceData,
        });
        await syncServiceStaffLinks(transaction, parsedInput.serviceId!, staffMemberIds);
      });
    } else {
      // Default a new service to be performable by every existing staff member
      // when the admin hasn't picked a subset yet. This preserves the pre-KAN-16
      // "everyone can do everything" experience for teams that haven't started
      // maintaining the mapping.
      const defaultStaffIds =
        staffMemberIds.length > 0
          ? staffMemberIds
          : (
              await prisma.staffMember.findMany({
                where: { businessId: business.id },
                select: { id: true },
              })
            ).map((member) => member.id);

      await prisma.service.create({
        data: {
          ...serviceData,
          staffLinks: {
            create: defaultStaffIds.map((staffMemberId) => ({
              staffMemberId,
            })),
          },
        },
      });
    }

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/", "/services", "/book"],
      adminPaths: ["/services", "/appointments", "/staff"],
    });
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
    const business = await getAdminBusiness(formData, locale);
    const serviceId = getFormString(formData.get("serviceId"));

    if (!serviceId) {
      return buildEntityActionState("error", t(locale, "actions.serviceIdMissing"));
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        serviceId,
        businessId: business.id,
      },
    });

    if (linkedAppointments > 0) {
      return buildEntityActionState(
        "error",
        t(locale, "actions.serviceDeleteLinked"),
      );
    }

    const deletedService = await prisma.service.deleteMany({
      where: {
        id: serviceId,
        businessId: business.id,
      },
    });

    if (deletedService.count === 0) {
      return buildEntityActionState("error", t(locale, "actions.serviceIdMissing"));
    }

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/", "/services", "/book"],
      adminPaths: ["/services", "/appointments"],
    });
    return buildEntityActionState("success", t(locale, "actions.serviceDeleted"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.serviceDeleteError"));
  }
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function syncStaffServiceLinks(
  transaction: PrismaTx,
  staffMemberId: string,
  nextServiceIds: string[],
) {
  const existing = await transaction.serviceStaff.findMany({
    where: { staffMemberId },
    select: { serviceId: true },
  });
  const existingIds = new Set(existing.map((row) => row.serviceId));
  const nextIds = new Set(nextServiceIds);

  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
  const toCreate = [...nextIds].filter((id) => !existingIds.has(id));

  if (toDelete.length > 0) {
    await transaction.serviceStaff.deleteMany({
      where: {
        staffMemberId,
        serviceId: { in: toDelete },
      },
    });
  }

  if (toCreate.length > 0) {
    await transaction.serviceStaff.createMany({
      data: toCreate.map((serviceId) => ({ staffMemberId, serviceId })),
    });
  }
}

async function syncServiceStaffLinks(
  transaction: PrismaTx,
  serviceId: string,
  nextStaffMemberIds: string[],
) {
  const existing = await transaction.serviceStaff.findMany({
    where: { serviceId },
    select: { staffMemberId: true },
  });
  const existingIds = new Set(existing.map((row) => row.staffMemberId));
  const nextIds = new Set(nextStaffMemberIds);

  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
  const toCreate = [...nextIds].filter((id) => !existingIds.has(id));

  if (toDelete.length > 0) {
    await transaction.serviceStaff.deleteMany({
      where: {
        serviceId,
        staffMemberId: { in: toDelete },
      },
    });
  }

  if (toCreate.length > 0) {
    await transaction.serviceStaff.createMany({
      data: toCreate.map((staffMemberId) => ({ serviceId, staffMemberId })),
    });
  }
}

/**
 * Build a default staff weekly schedule from the business's configured open
 * hours, skipping days explicitly marked closed. Returns the rows to nest-create
 * under a new StaffMember so it is bookable immediately (KAN-13).
 */
async function buildDefaultStaffAvailability(businessId: string) {
  const [businessHours, dayStates] = await Promise.all([
    prisma.businessHours.findMany({
      where: { businessId },
      select: { dayOfWeek: true, openTime: true, closeTime: true },
    }),
    prisma.businessHoursDay.findMany({
      where: { businessId, isClosed: true },
      select: { dayOfWeek: true },
    }),
  ]);

  const closedDays = new Set(dayStates.map((day) => day.dayOfWeek));

  return businessHours
    .filter((window) => !closedDays.has(window.dayOfWeek))
    .map((window) => ({
      dayOfWeek: window.dayOfWeek,
      startTime: window.openTime,
      endTime: window.closeTime,
    }));
}

export async function upsertStaffMemberAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
    const parsedInput = buildStaffSchema(locale).parse({
      staffMemberId: getOptionalFormString(formData.get("staffMemberId")),
      name: getFormString(formData.get("name")),
      slug: getOptionalFormString(formData.get("slug")),
      title: getOptionalFormString(formData.get("title")),
      bio: getOptionalFormString(formData.get("bio")),
      sortOrder: getFormString(formData.get("sortOrder")),
      isActive: getFormCheckbox(formData, "isActive"),
      serviceIds: formData
        .getAll("serviceIds")
        .map((value) => getFormString(value))
        .filter(Boolean),
    });
    const slug = parsedInput.slug || slugify(parsedInput.name);

    const duplicateStaffMember = await prisma.staffMember.findFirst({
      where: {
        businessId: business.id,
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

    const serviceIds = [...new Set(parsedInput.serviceIds)];
    const businessServices =
      serviceIds.length > 0
        ? await prisma.service.findMany({
            where: {
              businessId: business.id,
              id: { in: serviceIds },
            },
            select: { id: true },
          })
        : [];
    const validServiceIds = new Set(businessServices.map((service) => service.id));

    if (serviceIds.some((id) => !validServiceIds.has(id))) {
      return buildEntityActionState("error", t(locale, "actions.staffServicesInvalid"), {
        serviceIds: t(locale, "actions.staffServicesInvalid"),
      });
    }

    const staffMemberData = {
      businessId: business.id,
      name: parsedInput.name,
      slug,
      title: parsedInput.title ?? null,
      bio: parsedInput.bio ?? null,
      sortOrder: parsedInput.sortOrder,
      isActive: parsedInput.isActive,
    };

    if (parsedInput.staffMemberId) {
      const existingStaffMember = await prisma.staffMember.findFirst({
        where: {
          id: parsedInput.staffMemberId,
          businessId: business.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingStaffMember) {
        return buildEntityActionState("error", t(locale, "actions.staffIdMissing"));
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.staffMember.update({
          where: { id: parsedInput.staffMemberId },
          data: staffMemberData,
        });
        await syncStaffServiceLinks(
          transaction,
          parsedInput.staffMemberId!,
          serviceIds,
        );
      });
    } else {
      // Seed a default weekly schedule mirroring the business's open hours so a
      // newly created staff member is immediately bookable (KAN-13). Without
      // this, staff have zero StaffAvailability rows and generate no slots.
      const defaultAvailability = await buildDefaultStaffAvailability(business.id);
      // Default a new staff member to be capable of every existing service when
      // the admin hasn't picked a subset yet. Mirrors the pre-KAN-16 "everyone
      // can do everything" behaviour so brand-new hires stay bookable.
      const defaultServiceIds =
        serviceIds.length > 0
          ? serviceIds
          : (
              await prisma.service.findMany({
                where: { businessId: business.id },
                select: { id: true },
              })
            ).map((service) => service.id);

      await prisma.staffMember.create({
        data: {
          ...staffMemberData,
          availabilities: {
            create: defaultAvailability,
          },
          serviceLinks: {
            create: defaultServiceIds.map((serviceId) => ({
              serviceId,
            })),
          },
        },
      });
    }

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/", "/services", "/book"],
      adminPaths: ["/staff", "/services", "/appointments", "/calendar"],
    });
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
    const business = await getAdminBusiness(formData, locale);
    const staffMemberId = getFormString(formData.get("staffMemberId"));

    if (!staffMemberId) {
      return buildEntityActionState("error", t(locale, "actions.staffIdMissing"));
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        staffMemberId,
        businessId: business.id,
      },
    });

    if (linkedAppointments > 0) {
      return buildEntityActionState(
        "error",
        t(locale, "actions.staffDeleteLinked"),
      );
    }

    const deletedStaffMember = await prisma.staffMember.deleteMany({
      where: {
        id: staffMemberId,
        businessId: business.id,
      },
    });

    if (deletedStaffMember.count === 0) {
      return buildEntityActionState("error", t(locale, "actions.staffIdMissing"));
    }

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/", "/services", "/book"],
      adminPaths: ["/staff", "/appointments", "/calendar"],
    });
    return buildEntityActionState("success", t(locale, "actions.staffDeleted"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.staffDeleteError"));
  }
}

export async function upsertStaffScheduleAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
    const openTimes = formData.getAll("openTime").map((value) => getFormString(value));
    const closeTimes = formData.getAll("closeTime").map((value) => getFormString(value));
    const periods = openTimes.map((openTime, index) => ({
      openTime,
      closeTime: closeTimes[index] ?? "",
    }));
    const parsedInput = buildStaffScheduleSchema(locale).parse({
      staffMemberId: getFormString(formData.get("staffMemberId")),
      dayOfWeek: getFormString(formData.get("dayOfWeek")),
      isOff: getFormCheckbox(formData, "isOff"),
      periods,
      copyToDayOfWeek: formData
        .getAll("copyToDayOfWeek")
        .map((value) => getFormString(value))
        .filter(Boolean),
    });

    const staffMember = await prisma.staffMember.findFirst({
      where: {
        id: parsedInput.staffMemberId,
        businessId: business.id,
      },
      select: { id: true },
    });

    if (!staffMember) {
      return buildEntityActionState("error", t(locale, "actions.staffIdMissing"));
    }

    const validatedPeriods = validateBusinessPeriods({
      periods: parsedInput.periods,
      isClosed: parsedInput.isOff,
      locale,
    });

    if (validatedPeriods.hasErrors) {
      const fieldErrors = buildBusinessPeriodFieldErrors(validatedPeriods);

      return buildEntityActionState(
        "error",
        validatedPeriods.formError ??
          Object.values(fieldErrors)[0] ??
          t(locale, "actions.staffScheduleSaveError"),
        fieldErrors,
      );
    }

    const copyToDayOfWeek = [...new Set(parsedInput.copyToDayOfWeek)].filter(
      (dayOfWeek) => dayOfWeek !== parsedInput.dayOfWeek,
    );

    if (
      copyToDayOfWeek.length > 0 &&
      (parsedInput.isOff || validatedPeriods.sortedPeriods.length === 0)
    ) {
      return buildEntityActionState("error", t(locale, "actions.copyRequiresPeriod"), {
        copyToDayOfWeek: t(locale, "actions.copyRequiresPeriodField"),
      });
    }

    const sortedPeriods = sortBusinessPeriods(validatedPeriods.sortedPeriods);

    await prisma.$transaction(async (transaction) => {
      const daysToReplace = [parsedInput.dayOfWeek, ...copyToDayOfWeek];

      await transaction.staffAvailability.deleteMany({
        where: {
          staffMemberId: parsedInput.staffMemberId,
          dayOfWeek: {
            in: daysToReplace,
          },
        },
      });

      const rowsToCreate = daysToReplace.flatMap((dayOfWeek) => {
        const isTargetDay = dayOfWeek === parsedInput.dayOfWeek;
        const dayIsOff = isTargetDay ? parsedInput.isOff : false;

        if (dayIsOff || sortedPeriods.length === 0) {
          return [];
        }

        return sortedPeriods.map((period) => ({
          staffMemberId: parsedInput.staffMemberId,
          dayOfWeek,
          startTime: period.openTime,
          endTime: period.closeTime,
          isOff: false,
        }));
      });

      if (rowsToCreate.length > 0) {
        await transaction.staffAvailability.createMany({
          data: rowsToCreate,
        });
      }
    });

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/book"],
      adminPaths: ["/staff", "/calendar"],
    });

    return buildEntityActionState(
      "success",
      copyToDayOfWeek.length > 0
        ? copyToDayOfWeek.length === 1
          ? t(locale, "actions.staffScheduleCopiedOne")
          : t(locale, "actions.staffScheduleCopied", {
              count: copyToDayOfWeek.length,
            })
        : t(locale, "actions.staffScheduleUpdated"),
    );
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.staffScheduleSaveError"));
  }
}

export async function upsertBusinessHoursAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
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
                businessId: business.id,
                dayOfWeek,
              },
            },
            update: {
              isClosed: dayOfWeek === parsedInput.dayOfWeek ? parsedInput.isClosed : false,
            },
            create: {
              businessId: business.id,
              dayOfWeek,
              isClosed: dayOfWeek === parsedInput.dayOfWeek ? parsedInput.isClosed : false,
            },
          }),
        ),
      );

      await transaction.businessHours.deleteMany({
        where: {
          businessId: business.id,
          dayOfWeek: {
            in: daysToReplace,
          },
        },
      });

      if (sortedPeriods.length > 0) {
        await transaction.businessHours.createMany({
          data: daysToReplace.flatMap((dayOfWeek) =>
            sortedPeriods.map((period) => ({
              businessId: business.id,
              dayOfWeek,
              openTime: period.openTime,
              closeTime: period.closeTime,
            })),
          ),
        });
      }
    });

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/book"],
      adminPaths: ["/calendar"],
    });
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
    const business = await getAdminBusiness(formData, locale);
    const parsedInput = buildBlackoutSchema(locale).parse({
      blackoutDateId: getOptionalFormString(formData.get("blackoutDateId")),
      staffMemberId: getOptionalFormString(formData.get("staffMemberId")),
      startsAt: getFormString(formData.get("startsAt")),
      endsAt: getFormString(formData.get("endsAt")),
      reason: getOptionalFormString(formData.get("reason")),
    });

    if (parsedInput.staffMemberId) {
      const staffMember = await prisma.staffMember.findFirst({
        where: {
          id: parsedInput.staffMemberId,
          businessId: business.id,
        },
        select: {
          id: true,
        },
      });

      if (!staffMember) {
        return buildEntityActionState("error", t(locale, "actions.staffIdMissing"), {
          staffMemberId: t(locale, "actions.staffIdMissing"),
        });
      }
    }

    const blackoutData = {
      businessId: business.id,
      staffMemberId: parsedInput.staffMemberId ?? null,
      startsAt: parsedInput.startsAtDate,
      endsAt: parsedInput.endsAtDate,
      reason: parsedInput.reason ?? null,
    };

    if (parsedInput.blackoutDateId) {
      const existingBlackoutDate = await prisma.blackoutDate.findFirst({
        where: {
          id: parsedInput.blackoutDateId,
          businessId: business.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingBlackoutDate) {
        return buildEntityActionState("error", t(locale, "actions.blackoutIdMissing"));
      }

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

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/book"],
      adminPaths: ["/calendar"],
    });
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
    const business = await getAdminBusiness(formData, locale);
    const blackoutDateId = getFormString(formData.get("blackoutDateId"));

    if (!blackoutDateId) {
      return buildEntityActionState("error", t(locale, "actions.blackoutIdMissing"));
    }

    const deletedBlackoutDate = await prisma.blackoutDate.deleteMany({
      where: {
        id: blackoutDateId,
        businessId: business.id,
      },
    });

    if (deletedBlackoutDate.count === 0) {
      return buildEntityActionState("error", t(locale, "actions.blackoutIdMissing"));
    }

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/book"],
      adminPaths: ["/calendar"],
    });
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

const CONFLICT_SCAN_SLACK_MINUTES = 24 * 60;

function buildAppointmentUpdateSchema(locale: unknown) {
  return z
    .object({
      appointmentId: z.string().min(1, t(locale, "actions.appointmentIdMissing")),
      staffMemberId: z.string().optional(),
      notes: z.string().trim().max(500).optional(),
      startAt: z.string().min(1, t(locale, "actions.appointmentStartRequired")),
    })
    .transform((value) => ({
      ...value,
      startAtDate: new Date(value.startAt),
    }))
    .superRefine((value, context) => {
      if (Number.isNaN(value.startAtDate.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t(locale, "actions.appointmentStartInvalid"),
          path: ["startAt"],
        });
      }
    });
}

export async function updateAppointmentAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
    const parsedInput = buildAppointmentUpdateSchema(locale).parse({
      appointmentId: getFormString(formData.get("appointmentId")),
      staffMemberId: getOptionalFormString(formData.get("staffMemberId")),
      notes: getOptionalFormString(formData.get("notes")),
      startAt: getFormString(formData.get("startAt")),
    });

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: parsedInput.appointmentId,
        businessId: business.id,
      },
      select: {
        id: true,
        serviceId: true,
        service: {
          select: {
            durationMinutes: true,
            prepMinutes: true,
            bufferMinutes: true,
          },
        },
      },
    });

    if (!appointment) {
      return buildEntityActionState("error", t(locale, "actions.appointmentNotFound"));
    }

    const nextStaffMemberId = parsedInput.staffMemberId ?? null;

    if (nextStaffMemberId) {
      const staffMember = await prisma.staffMember.findFirst({
        where: {
          id: nextStaffMemberId,
          businessId: business.id,
        },
        select: {
          id: true,
          serviceLinks: {
            where: {
              serviceId: appointment.serviceId,
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!staffMember) {
        return buildEntityActionState(
          "error",
          t(locale, "actions.appointmentStaffNotFound"),
          { staffMemberId: t(locale, "actions.appointmentStaffNotFound") },
        );
      }

      if (staffMember.serviceLinks.length === 0) {
        return buildEntityActionState(
          "error",
          t(locale, "actions.appointmentStaffCannotService"),
          { staffMemberId: t(locale, "actions.appointmentStaffCannotService") },
        );
      }
    }

    const nextStartAt = parsedInput.startAtDate;
    const nextEndAt = addMinutes(nextStartAt, appointment.service.durationMinutes);
    const nextOccupiedFrom = addMinutes(nextStartAt, -appointment.service.prepMinutes);
    const nextOccupiedUntil = addMinutes(nextEndAt, appointment.service.bufferMinutes);

    if (nextStaffMemberId) {
      // Neighbours' occupied windows extend beyond their stored startAt/endAt by
      // their own prep/buffer, so the coarse SQL range gets a day of slack and
      // the exact prep/buffer-aware overlap check happens below.
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          businessId: business.id,
          staffMemberId: nextStaffMemberId,
          status: {
            not: AppointmentStatus.CANCELLED,
          },
          id: {
            not: appointment.id,
          },
          startAt: {
            lt: addMinutes(nextOccupiedUntil, CONFLICT_SCAN_SLACK_MINUTES),
          },
          endAt: {
            gt: addMinutes(nextOccupiedFrom, -CONFLICT_SCAN_SLACK_MINUTES),
          },
        },
        select: {
          startAt: true,
          endAt: true,
          service: {
            select: {
              prepMinutes: true,
              bufferMinutes: true,
            },
          },
        },
      });

      const hasConflict = conflictingAppointments.some((existing) => {
        const existingOccupiedFrom = addMinutes(
          existing.startAt,
          -existing.service.prepMinutes,
        );
        const existingOccupiedUntil = addMinutes(
          existing.endAt,
          existing.service.bufferMinutes,
        );

        return (
          nextOccupiedFrom.getTime() < existingOccupiedUntil.getTime() &&
          nextOccupiedUntil.getTime() > existingOccupiedFrom.getTime()
        );
      });

      if (hasConflict) {
        return buildEntityActionState(
          "error",
          t(locale, "actions.appointmentSlotConflict"),
          { startAt: t(locale, "actions.appointmentSlotConflict") },
        );
      }
    }

    await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        staffMemberId: nextStaffMemberId,
        notes: parsedInput.notes ?? null,
        startAt: nextStartAt,
        endAt: nextEndAt,
      },
    });

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/book"],
      adminPaths: ["/appointments", "/calendar"],
    });
    return buildEntityActionState("success", t(locale, "actions.appointmentSaved"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.appointmentSaveError"));
  }
}

export async function updateDefaultLocaleAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
    const parsedInput = buildLocalizationSchema(locale).parse({
      defaultLocale: getFormString(formData.get("defaultLocale")),
    });
    const nextLocale = normalizeLocale(parsedInput.defaultLocale);

    await prisma.business.update({
      where: {
        id: business.id,
      },
      data: {
        defaultLocale: nextLocale,
      },
    });

    revalidateTag("public-branding", "max");
    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/", "/services", "/book"],
      adminPaths: ["/", "/calendar", "/appointments", "/services", "/staff", "/branding", "/settings"],
    });

    return buildEntityActionState("success", t(nextLocale, "actions.languageSaved"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.languageSaveError"));
  }
}

const APPOINTMENT_STATUS_VALUES = Object.values(AppointmentStatus) as string[];

export async function updateAppointmentStatusAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
    const appointmentId = getFormString(formData.get("appointmentId"));
    const status = getFormString(formData.get("status"));

    if (!appointmentId) {
      return buildEntityActionState("error", t(locale, "actions.appointmentIdMissing"));
    }

    if (!APPOINTMENT_STATUS_VALUES.includes(status)) {
      return buildEntityActionState("error", t(locale, "actions.appointmentStatusInvalid"));
    }

    // Scope by businessId so an admin can only mutate their own appointments.
    const updated = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        businessId: business.id,
      },
      data: {
        status: status as AppointmentStatus,
      },
    });

    if (updated.count === 0) {
      return buildEntityActionState("error", t(locale, "actions.appointmentIdMissing"));
    }

    revalidateTenantPaths({
      businessSlug: business.slug,
      // Cancelling frees the slot, so refresh the public booking flow too.
      publicPaths: ["/", "/book"],
      adminPaths: ["/appointments", "/calendar"],
    });

    return buildEntityActionState("success", t(locale, "actions.appointmentStatusUpdated"));
  } catch (error) {
    return handleEntityMutationError(error, t(locale, "actions.appointmentStatusError"));
  }
}

export async function createManualAppointmentAction(
  _previousState: AdminEntityActionState,
  formData: FormData,
): Promise<AdminEntityActionState> {
  const locale = getActionLocale(formData);

  try {
    const business = await getAdminBusiness(formData, locale);
    const customerPhone = getOptionalFormString(formData.get("customerPhone"));
    const parsedInput = adminBookingSchema.parse({
      serviceId: getFormString(formData.get("serviceId")),
      staffMemberId: getOptionalFormString(formData.get("staffMemberId")),
      date: getFormString(formData.get("date")),
      slotStart: getFormString(formData.get("slotStart")),
      customerName: getFormString(formData.get("customerName")),
      customerEmail: getFormString(formData.get("customerEmail")),
      customerPhone,
      notes: getOptionalFormString(formData.get("notes")),
    });

    const result = await bookAppointmentSlot(
      {
        businessId: business.id,
        serviceId: parsedInput.serviceId,
        staffMemberId: parsedInput.staffMemberId,
        date: parsedInput.date,
        slotStart: parsedInput.slotStart,
        customerId: null,
        customerName: parsedInput.customerName,
        customerEmail: parsedInput.customerEmail,
        customerPhone: parsedInput.customerPhone,
        notes: parsedInput.notes,
        bookingType: AppointmentBookingType.GUEST,
        guestFullName: parsedInput.customerName,
        guestEmail: parsedInput.customerEmail,
        guestPhone: parsedInput.customerPhone ?? null,
      },
      locale,
    );

    if (result.status === "slot-unavailable") {
      return buildEntityActionState("error", t(locale, "validation.slotUnavailable"));
    }

    prepareAppointmentConfirmation({
      appointment: result.appointment,
      managementToken: result.managementToken,
    });

    revalidateTenantPaths({
      businessSlug: business.slug,
      publicPaths: ["/", "/book"],
      adminPaths: ["/appointments", "/calendar"],
    });

    return buildEntityActionState("success", t(locale, "actions.appointmentCreated"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildEntityActionState(
        "error",
        t(locale, "actions.appointmentCreateError"),
        buildAppointmentFieldErrors(error, locale),
      );
    }

    if (error instanceof Error && error.message === "SERVICE_NOT_FOUND") {
      return buildEntityActionState("error", t(locale, "validation.serviceNotFound"));
    }

    if (error instanceof Error && error.message === "STAFF_NOT_FOUND") {
      return buildEntityActionState("error", t(locale, "validation.staffNotFound"));
    }

    return handleEntityMutationError(error, t(locale, "actions.appointmentCreateError"));
  }
}
