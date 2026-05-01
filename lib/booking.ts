import { AppointmentStatus } from "@prisma/client";
import { addDays, addMinutes, format, getDay, parseISO, startOfDay } from "date-fns";
import { createHash, randomBytes } from "node:crypto";

import { intersectDateWindows } from "@/lib/business-hours";
import { DEFAULT_LOCALE, getDateFnsLocale, normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const SLOT_INTERVAL_MINUTES = 15;

export type AvailabilitySlot = {
  startAt: Date;
  endAt: Date;
  occupiedUntil: Date;
  label: string;
};

type AvailabilityInput = {
  businessId: string;
  serviceId: string;
  staffMemberId: string;
  date: string;
};

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);

  next.setHours(hours, minutes, 0, 0);

  return next;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export async function getDailyAvailability(
  input: AvailabilityInput,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  const locale = normalizeLocale(localeInput);
  const targetDay = parseISO(input.date);
  const dayStart = startOfDay(targetDay);
  const dayEnd = addDays(dayStart, 1);
  const dayOfWeek = getDay(targetDay);

  const [service, staffMember, businessHoursDay, businessHours, blackoutDates, appointments] = await Promise.all([
    prisma.service.findFirst({
      where: {
        id: input.serviceId,
        businessId: input.businessId,
        isActive: true,
      },
      select: {
        id: true,
        durationMinutes: true,
        bufferMinutes: true,
      },
    }),
    prisma.staffMember.findFirst({
      where: {
        id: input.staffMemberId,
        businessId: input.businessId,
        isActive: true,
      },
      select: {
        id: true,
        availabilities: {
          where: {
            dayOfWeek,
            isOff: false,
          },
          orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    }),
    prisma.businessHoursDay.findUnique({
      where: {
        businessId_dayOfWeek: {
          businessId: input.businessId,
          dayOfWeek,
        },
      },
      select: {
        isClosed: true,
      },
    }),
    prisma.businessHours.findMany({
      where: {
        businessId: input.businessId,
        dayOfWeek,
      },
      orderBy: [{ openTime: "asc" }, { closeTime: "asc" }],
      select: {
        openTime: true,
        closeTime: true,
      },
    }),
    prisma.blackoutDate.findMany({
      where: {
        businessId: input.businessId,
        startsAt: {
          lt: dayEnd,
        },
        endsAt: {
          gt: dayStart,
        },
        OR: [{ staffMemberId: null }, { staffMemberId: input.staffMemberId }],
      },
      orderBy: {
        startsAt: "asc",
      },
      select: {
        startsAt: true,
        endsAt: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: input.businessId,
        staffMemberId: input.staffMemberId,
        status: {
          not: AppointmentStatus.CANCELLED,
        },
        startAt: {
          lt: dayEnd,
        },
        endAt: {
          gt: dayStart,
        },
      },
      orderBy: {
        startAt: "asc",
      },
      select: {
        startAt: true,
        endAt: true,
        service: {
          select: {
            bufferMinutes: true,
          },
        },
      },
    }),
  ]);

  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  if (!staffMember) {
    throw new Error("STAFF_NOT_FOUND");
  }

  const isBusinessClosed = businessHoursDay?.isClosed ?? businessHours.length === 0;

  if (isBusinessClosed || businessHours.length === 0) {
    return {
      serviceDurationMinutes: service.durationMinutes,
      serviceBufferMinutes: service.bufferMinutes,
      slots: [] as AvailabilitySlot[],
    };
  }

  const serviceBlockMinutes = service.durationMinutes + service.bufferMinutes;
  const businessWindows = businessHours.map((window) => ({
    startAt: combineDateAndTime(targetDay, window.openTime),
    endAt: combineDateAndTime(targetDay, window.closeTime),
  }));
  const staffWindows = staffMember.availabilities.map((availability) => ({
    startAt: combineDateAndTime(targetDay, availability.startTime),
    endAt: combineDateAndTime(targetDay, availability.endTime),
  }));
  const workWindows = intersectDateWindows(staffWindows, businessWindows);

  const slots: AvailabilitySlot[] = [];

  for (const window of workWindows) {
    for (
      let cursor = new Date(window.startAt);
      addMinutes(cursor, serviceBlockMinutes).getTime() <= window.endAt.getTime();
      cursor = addMinutes(cursor, SLOT_INTERVAL_MINUTES)
    ) {
      const serviceEnd = addMinutes(cursor, service.durationMinutes);
      const occupiedUntil = addMinutes(cursor, serviceBlockMinutes);

      const blockedByBlackout = blackoutDates.some((blackout) =>
        overlaps(cursor, occupiedUntil, blackout.startsAt, blackout.endsAt),
      );

      if (blockedByBlackout) {
        continue;
      }

      const blockedByAppointment = appointments.some((appointment) => {
        const existingOccupiedUntil = addMinutes(
          appointment.endAt,
          appointment.service.bufferMinutes,
        );

        return overlaps(cursor, occupiedUntil, appointment.startAt, existingOccupiedUntil);
      });

      if (blockedByAppointment) {
        continue;
      }

      slots.push({
        startAt: new Date(cursor),
        endAt: serviceEnd,
        occupiedUntil,
        label: format(cursor, "h:mm a", { locale: getDateFnsLocale(locale) }),
      });
    }
  }

  return {
    serviceDurationMinutes: service.durationMinutes,
    serviceBufferMinutes: service.bufferMinutes,
    slots,
  };
}

export function createConfirmationCode() {
  return crypto.randomUUID().split("-")[0].toUpperCase();
}

export function createAppointmentManagementToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return {
    token,
    tokenHash,
  };
}
