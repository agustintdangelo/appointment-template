import { AppointmentStatus } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { createGuardedAppointment } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { seedBookableBusiness } from "./helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createGuardedAppointment (KAN-12 double-booking guard)", () => {
  it("lets only one of two simultaneous bookings for the same staff/slot commit", async () => {
    const seed = await seedBookableBusiness();

    const startAt = new Date("2030-06-03T14:00:00.000Z");
    const endAt = new Date("2030-06-03T15:00:00.000Z");

    function book(customerName: string) {
      return createGuardedAppointment({
        businessId: seed.businessId,
        staffMemberId: seed.staffMemberId,
        startAt,
        endAt,
        data: {
          businessId: seed.businessId,
          serviceId: seed.serviceId,
          staffMemberId: seed.staffMemberId,
          customerName,
          customerEmail: `${customerName}@example.com`,
          status: AppointmentStatus.CONFIRMED,
          confirmationCode: `CODE-${customerName}`,
          startAt,
          endAt,
        },
        select: { id: true },
      });
    }

    const [first, second] = await Promise.all([book("alice"), book("bob")]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["conflict", "created"]);

    // Exactly one appointment exists for that staff + interval.
    const committed = await prisma.appointment.count({
      where: {
        staffMemberId: seed.staffMemberId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        status: { not: AppointmentStatus.CANCELLED },
      },
    });
    expect(committed).toBe(1);
  });

  it("allows rebooking the slot after the first appointment is cancelled", async () => {
    const seed = await seedBookableBusiness();
    const startAt = new Date("2030-07-01T16:00:00.000Z");
    const endAt = new Date("2030-07-01T17:00:00.000Z");

    const first = await createGuardedAppointment({
      businessId: seed.businessId,
      staffMemberId: seed.staffMemberId,
      startAt,
      endAt,
      data: {
        businessId: seed.businessId,
        serviceId: seed.serviceId,
        staffMemberId: seed.staffMemberId,
        customerName: "first",
        customerEmail: "first@example.com",
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: "REBOOK-1",
        startAt,
        endAt,
      },
      select: { id: true },
    });
    expect(first.status).toBe("created");

    if (first.status !== "created") return;
    await prisma.appointment.update({
      where: { id: first.appointment.id },
      data: { status: AppointmentStatus.CANCELLED },
    });

    const second = await createGuardedAppointment({
      businessId: seed.businessId,
      staffMemberId: seed.staffMemberId,
      startAt,
      endAt,
      data: {
        businessId: seed.businessId,
        serviceId: seed.serviceId,
        staffMemberId: seed.staffMemberId,
        customerName: "second",
        customerEmail: "second@example.com",
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: "REBOOK-2",
        startAt,
        endAt,
      },
      select: { id: true },
    });
    expect(second.status).toBe("created");
  });
});
