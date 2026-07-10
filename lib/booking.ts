import { TZDate } from "@date-fns/tz";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { addDays, addMinutes, format, getDay } from "date-fns";
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

type BookingAvailabilityInput = {
  businessId: string;
  serviceId: string;
  staffMemberId?: string;
  date: string;
};

export type BookingAvailabilitySlot = AvailabilitySlot & {
  assignedStaffMemberId: string;
  staffMemberName: string;
};

type CreateBookingInput = BookingAvailabilityInput & {
  slotStart: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
};

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

/**
 * Build the UTC instant for a wall-clock time on a given calendar day, as it
 * occurs in the business's timezone. Using TZDate means the offset (incl. DST)
 * is resolved for that specific date, so slot math is correct regardless of the
 * server/host timezone.
 */
function combineDateAndTime(date: string, time: string, timeZone: string) {
  const { year, month, day } = parseDateParts(date);
  const [hours, minutes] = time.split(":").map(Number);

  return new TZDate(year, month - 1, day, hours, minutes, 0, 0, timeZone);
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export async function getDailyAvailability(
  input: AvailabilityInput,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  const locale = normalizeLocale(localeInput);

  const business = await prisma.business.findUnique({
    where: {
      id: input.businessId,
    },
    select: {
      timezone: true,
    },
  });

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const timeZone = business.timezone;
  // Day boundaries and weekday are resolved in the business timezone so that
  // the queried window and slot generation match the business's local day,
  // independent of the server/host timezone. Boundaries are passed to Prisma as
  // plain UTC Dates.
  const dayStartTz = combineDateAndTime(input.date, "00:00", timeZone);
  const dayStart = new Date(dayStartTz.getTime());
  const dayEnd = new Date(addDays(dayStartTz, 1).getTime());
  const dayOfWeek = getDay(combineDateAndTime(input.date, "12:00", timeZone));

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
        serviceLinks: {
          some: {
            serviceId: input.serviceId,
          },
        },
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
    startAt: combineDateAndTime(input.date, window.openTime, timeZone),
    endAt: combineDateAndTime(input.date, window.closeTime, timeZone),
  }));
  const staffWindows = staffMember.availabilities.map((availability) => ({
    startAt: combineDateAndTime(input.date, availability.startTime, timeZone),
    endAt: combineDateAndTime(input.date, availability.endTime, timeZone),
  }));
  const workWindows = intersectDateWindows(staffWindows, businessWindows);

  // Exclude slots that start in the past (compared against the real "now"
  // instant). Because every slot start is a real UTC instant, this works for
  // same-day bookings regardless of timezone.
  const nowMs = Date.now();

  const slots: AvailabilitySlot[] = [];

  for (const window of workWindows) {
    for (
      // Keep the cursor as a TZDate clone so slot labels render in the
      // business timezone, not the server's.
      let cursor = addMinutes(window.startAt, 0);
      addMinutes(cursor, serviceBlockMinutes).getTime() <= window.endAt.getTime();
      cursor = addMinutes(cursor, SLOT_INTERVAL_MINUTES)
    ) {
      const serviceEnd = addMinutes(cursor, service.durationMinutes);
      const occupiedUntil = addMinutes(cursor, serviceBlockMinutes);

      if (cursor.getTime() < nowMs) {
        continue;
      }

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
        // Persist/transport as plain UTC Dates so `toISOString()` is canonical;
        // the label is rendered from the TZDate cursor in the business TZ.
        startAt: new Date(cursor.getTime()),
        endAt: new Date(serviceEnd.getTime()),
        occupiedUntil: new Date(occupiedUntil.getTime()),
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

export async function getBookingAvailability(
  input: BookingAvailabilityInput,
  localeInput: unknown = DEFAULT_LOCALE,
) {
  if (input.staffMemberId) {
    const [availability, staffMember] = await Promise.all([
      getDailyAvailability(
        {
          businessId: input.businessId,
          serviceId: input.serviceId,
          staffMemberId: input.staffMemberId,
          date: input.date,
        },
        localeInput,
      ),
      prisma.staffMember.findFirst({
        where: {
          id: input.staffMemberId,
          businessId: input.businessId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    if (!staffMember) {
      throw new Error("Staff member not found.");
    }

    return {
      serviceDurationMinutes: availability.serviceDurationMinutes,
      serviceBufferMinutes: availability.serviceBufferMinutes,
      slots: availability.slots.map((slot) => ({
        ...slot,
        assignedStaffMemberId: staffMember.id,
        staffMemberName: staffMember.name,
      })),
    };
  }

  // "Any professional" mode must still respect service-staff bookability:
  // only staff explicitly mapped to this service should be considered.
  const staffMembers = await prisma.staffMember.findMany({
    where: {
      businessId: input.businessId,
      isActive: true,
      serviceLinks: {
        some: {
          serviceId: input.serviceId,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  if (staffMembers.length === 0) {
    return {
      serviceDurationMinutes: 0,
      serviceBufferMinutes: 0,
      slots: [] as BookingAvailabilitySlot[],
    };
  }

  const availabilityByStaff = await Promise.all(
    staffMembers.map(async (staffMember) => ({
      staffMember,
      availability: await getDailyAvailability({
        businessId: input.businessId,
        serviceId: input.serviceId,
        staffMemberId: staffMember.id,
        date: input.date,
      }, localeInput),
    })),
  );
  const slotsByStart = new Map<string, BookingAvailabilitySlot>();

  for (const { staffMember, availability } of availabilityByStaff) {
    for (const slot of availability.slots) {
      const slotKey = slot.startAt.toISOString();

      if (!slotsByStart.has(slotKey)) {
        slotsByStart.set(slotKey, {
          ...slot,
          assignedStaffMemberId: staffMember.id,
          staffMemberName: staffMember.name,
        });
      }
    }
  }

  const firstAvailability = availabilityByStaff[0]?.availability;

  return {
    serviceDurationMinutes: firstAvailability?.serviceDurationMinutes ?? 0,
    serviceBufferMinutes: firstAvailability?.serviceBufferMinutes ?? 0,
    slots: Array.from(slotsByStart.values()).sort(
      (left, right) => left.startAt.getTime() - right.startAt.getTime(),
    ),
  };
}

/** Thrown inside the booking transaction when a conflicting appointment is found. */
class SlotTakenError extends Error {
  constructor() {
    super("SLOT_TAKEN");
    this.name = "SlotTakenError";
  }
}

/**
 * Insert an appointment while guarding against a concurrent double-booking.
 *
 * Availability is checked-then-inserted, so two concurrent requests for the same
 * staff/slot could both pass the availability check before either committed. This
 * runs the overlap re-check and the insert inside a single transaction: with the
 * single-connection better-sqlite3 adapter the transactions are serialized, so the
 * second request observes the first appointment and loses with a conflict.
 *
 * Returns `{ status: "conflict" }` for the loser; the caller maps that to a 409.
 */
export async function createGuardedAppointment<S extends Prisma.AppointmentSelect>(params: {
  businessId: string;
  staffMemberId: string;
  startAt: Date;
  endAt: Date;
  data: Prisma.AppointmentUncheckedCreateInput;
  select: S;
}): Promise<
  | { status: "created"; appointment: Prisma.AppointmentGetPayload<{ select: S }> }
  | { status: "conflict" }
> {
  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          businessId: params.businessId,
          staffMemberId: params.staffMemberId,
          status: {
            not: AppointmentStatus.CANCELLED,
          },
          startAt: {
            lt: params.endAt,
          },
          endAt: {
            gt: params.startAt,
          },
        },
        select: {
          id: true,
        },
      });

      if (conflict) {
        throw new SlotTakenError();
      }

      return tx.appointment.create({
        data: params.data,
        select: params.select,
      });
    });

    return { status: "created", appointment };
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { status: "conflict" };
    }

    throw error;
  }
}

export async function createBookingAppointment(input: CreateBookingInput) {
  const availability = await getBookingAvailability(input);
  const matchingSlot = availability.slots.find(
    (slot) => slot.startAt.toISOString() === input.slotStart,
  );

  if (!matchingSlot) {
    return {
      status: "slot-unavailable" as const,
    };
  }

  const result = await createGuardedAppointment({
    businessId: input.businessId,
    staffMemberId: matchingSlot.assignedStaffMemberId,
    startAt: matchingSlot.startAt,
    endAt: matchingSlot.endAt,
    data: {
      businessId: input.businessId,
      serviceId: input.serviceId,
      staffMemberId: matchingSlot.assignedStaffMemberId,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerPhone: input.customerPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      status: AppointmentStatus.CONFIRMED,
      confirmationCode: createConfirmationCode(),
      startAt: matchingSlot.startAt,
      endAt: matchingSlot.endAt,
    },
    select: {
      id: true,
    },
  });

  if (result.status === "conflict") {
    return {
      status: "slot-unavailable" as const,
    };
  }

  return {
    status: "created" as const,
    appointmentId: result.appointment.id,
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
