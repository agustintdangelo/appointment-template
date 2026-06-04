import { TZDate } from "@date-fns/tz";
import { afterAll, describe, expect, it } from "vitest";

import { getDailyAvailability } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { seedBookableBusiness } from "./helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getDailyAvailability (KAN-10 timezone / KAN-11 past slots)", () => {
  it("computes the first slot at the business-timezone open time, not the host time", async () => {
    const seed = await seedBookableBusiness({ timezone: "America/New_York", openTime: "09:00" });

    // A far-future weekday so no past-slot filtering interferes.
    const availability = await getDailyAvailability(
      { businessId: seed.businessId, serviceId: seed.serviceId, staffMemberId: seed.staffMemberId, date: "2030-06-05" },
      "en",
    );

    expect(availability.slots.length).toBeGreaterThan(0);
    const first = availability.slots[0];

    // 09:00 wall time in New York on that date, as a UTC instant.
    const expected = new TZDate(2030, 5, 5, 9, 0, 0, 0, "America/New_York");
    expect(first.startAt.toISOString()).toBe(new Date(expected.getTime()).toISOString());
    expect(first.label).toBe("9:00 AM");
  });

  it("produces a different UTC instant for the same wall-clock open time in another timezone", async () => {
    const ny = await seedBookableBusiness({ timezone: "America/New_York", openTime: "09:00" });
    const tokyo = await seedBookableBusiness({ timezone: "Asia/Tokyo", openTime: "09:00" });

    const [nyAvail, tokyoAvail] = await Promise.all([
      getDailyAvailability({ businessId: ny.businessId, serviceId: ny.serviceId, staffMemberId: ny.staffMemberId, date: "2030-06-05" }, "en"),
      getDailyAvailability({ businessId: tokyo.businessId, serviceId: tokyo.serviceId, staffMemberId: tokyo.staffMemberId, date: "2030-06-05" }, "en"),
    ]);

    // Same label, different absolute instant.
    expect(nyAvail.slots[0].label).toBe("9:00 AM");
    expect(tokyoAvail.slots[0].label).toBe("9:00 AM");
    expect(nyAvail.slots[0].startAt.toISOString()).not.toBe(tokyoAvail.slots[0].startAt.toISOString());
  });

  it("excludes slots that start in the past", async () => {
    const seed = await seedBookableBusiness({ timezone: "America/New_York", openTime: "00:00", closeTime: "23:45" });

    // "Today" in the business timezone.
    const todayInTz = new TZDate(new Date(), "America/New_York");
    const date = `${todayInTz.getFullYear()}-${String(todayInTz.getMonth() + 1).padStart(2, "0")}-${String(todayInTz.getDate()).padStart(2, "0")}`;

    const availability = await getDailyAvailability(
      { businessId: seed.businessId, serviceId: seed.serviceId, staffMemberId: seed.staffMemberId, date },
      "en",
    );

    const now = Date.now();
    for (const slot of availability.slots) {
      expect(slot.startAt.getTime()).toBeGreaterThanOrEqual(now);
    }
  });
});
