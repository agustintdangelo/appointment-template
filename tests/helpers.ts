import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

let counter = 0;

/**
 * Create an isolated business with one service and one staff member that is
 * open and available on every weekday in the given window. Each call uses a
 * unique slug so tests don't collide.
 */
export async function seedBookableBusiness(options?: {
  timezone?: string;
  openTime?: string;
  closeTime?: string;
  durationMinutes?: number;
  bufferMinutes?: number;
}) {
  counter += 1;
  const unique = `${randomUUID().slice(0, 8)}-${counter}`;
  const slug = `test-biz-${unique}`;
  const timezone = options?.timezone ?? "America/New_York";
  const openTime = options?.openTime ?? "09:00";
  const closeTime = options?.closeTime ?? "17:00";

  const business = await prisma.business.create({
    data: {
      name: `Test Business ${counter}`,
      slug,
      timezone,
    },
    select: { id: true, slug: true, timezone: true },
  });

  const service = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Test Service",
      slug: `svc-${counter}`,
      durationMinutes: options?.durationMinutes ?? 60,
      bufferMinutes: options?.bufferMinutes ?? 0,
      priceCents: 5000,
    },
    select: { id: true },
  });

  const staff = await prisma.staffMember.create({
    data: {
      businessId: business.id,
      name: "Test Staff",
      slug: `staff-${counter}`,
    },
    select: { id: true },
  });

  // Every seeded service must be linked to seeded staff, otherwise the
  // capability filter (KAN-16) would treat this staff member as unable to
  // perform the service and produce zero slots.
  await prisma.serviceStaff.create({
    data: {
      serviceId: service.id,
      staffMemberId: staff.id,
    },
  });

  // Open and staffed every day of the week within the window.
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    await prisma.businessHours.create({
      data: { businessId: business.id, dayOfWeek, openTime, closeTime },
    });
    await prisma.staffAvailability.create({
      data: {
        staffMemberId: staff.id,
        dayOfWeek,
        startTime: openTime,
        endTime: closeTime,
      },
    });
  }

  return { businessId: business.id, businessSlug: business.slug, timezone, serviceId: service.id, staffMemberId: staff.id };
}
