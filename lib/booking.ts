import { AppointmentStatus } from "@prisma/client";
import { addDays, addMinutes, format, getDay, parseISO, startOfDay } from "date-fns";

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

export async function getDailyAvailability(input: AvailabilityInput) {
  const targetDay = parseISO(input.date);
  const dayStart = startOfDay(targetDay);
  const dayEnd = addDays(dayStart, 1);
  const dayOfWeek = getDay(targetDay);

  const [service, staffMember, businessHours, blackoutDates, appointments] = await Promise.all([
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
    prisma.businessHours.findUnique({
      where: {
        businessId_dayOfWeek: {
          businessId: input.businessId,
          dayOfWeek,
        },
      },
      select: {
        openTime: true,
        closeTime: true,
        isClosed: true,
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
    throw new Error("Service not found.");
  }

  if (!staffMember) {
    throw new Error("Staff member not found.");
  }

  if (!businessHours || businessHours.isClosed) {
    return {
      serviceDurationMinutes: service.durationMinutes,
      serviceBufferMinutes: service.bufferMinutes,
      slots: [] as AvailabilitySlot[],
    };
  }

  const businessWindowStart = combineDateAndTime(targetDay, businessHours.openTime);
  const businessWindowEnd = combineDateAndTime(targetDay, businessHours.closeTime);
  const serviceBlockMinutes = service.durationMinutes + service.bufferMinutes;

  const workWindows = staffMember.availabilities
    .map((availability) => {
      const availabilityStart = combineDateAndTime(targetDay, availability.startTime);
      const availabilityEnd = combineDateAndTime(targetDay, availability.endTime);
      const windowStart =
        availabilityStart.getTime() > businessWindowStart.getTime()
          ? availabilityStart
          : businessWindowStart;
      const windowEnd =
        availabilityEnd.getTime() < businessWindowEnd.getTime()
          ? availabilityEnd
          : businessWindowEnd;

      return {
        startAt: windowStart,
        endAt: windowEnd,
      };
    })
    .filter((window) => window.startAt.getTime() < window.endAt.getTime());

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
        label: format(cursor, "h:mm a"),
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
