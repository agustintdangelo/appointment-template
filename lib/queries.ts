import { unstable_cache } from "next/cache";

import { normalizeBusinessHoursDays } from "@/lib/business-hours";
import { prisma } from "@/lib/prisma";

export async function getPrimaryBusiness() {
  return prisma.business.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      email: true,
      description: true,
      heroHeadline: true,
      heroSubheadline: true,
      services: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          durationMinutes: true,
          bufferMinutes: true,
          priceCents: true,
        },
      },
      staffMembers: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          title: true,
          bio: true,
        },
      },
    },
  });
}

const getCachedPublicBranding = unstable_cache(
  async () => {
    return prisma.business.findFirst({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
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
  },
  ["public-branding"],
  {
    tags: ["public-branding"],
  },
);

export async function getPublicBranding() {
  return getCachedPublicBranding();
}

export async function getAppointmentConfirmation(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    select: {
      id: true,
      confirmationCode: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      notes: true,
      status: true,
      startAt: true,
      endAt: true,
      business: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      service: {
        select: {
          name: true,
          durationMinutes: true,
          bufferMinutes: true,
          priceCents: true,
        },
      },
      staffMember: {
        select: {
          name: true,
          title: true,
        },
      },
    },
  });
}

export async function getAdminAppointments() {
  const business = await prisma.business.findFirst({
    select: {
      id: true,
      name: true,
    },
  });

  if (!business) {
    return null;
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      confirmationCode: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      notes: true,
      status: true,
      startAt: true,
      endAt: true,
      service: {
        select: {
          name: true,
        },
      },
      staffMember: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    business,
    appointments,
  };
}

export async function getAdminBusinessSummary() {
  return prisma.business.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      phone: true,
      email: true,
    },
  });
}

export async function getAdminBranding() {
  return prisma.business.findFirst({
    select: {
      id: true,
      name: true,
      description: true,
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
}

export async function getAdminServices() {
  const business = await getAdminBusinessSummary();

  if (!business) {
    return null;
  }

  const services = await prisma.service.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      durationMinutes: true,
      bufferMinutes: true,
      priceCents: true,
      isActive: true,
      sortOrder: true,
      _count: {
        select: {
          appointments: true,
        },
      },
    },
  });

  return {
    business,
    services,
  };
}

export async function getAdminStaffMembers() {
  const business = await getAdminBusinessSummary();

  if (!business) {
    return null;
  }

  const staffMembers = await prisma.staffMember.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      title: true,
      bio: true,
      isActive: true,
      sortOrder: true,
      _count: {
        select: {
          appointments: true,
          availabilities: true,
          blackoutDates: true,
        },
      },
    },
  });

  return {
    business,
    staffMembers,
  };
}

export async function getAdminBusinessHours() {
  const business = await getAdminBusinessSummary();

  if (!business) {
    return null;
  }

  const [businessHourDays, businessHours] = await Promise.all([
    prisma.businessHoursDay.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: {
        dayOfWeek: "asc",
      },
      select: {
        id: true,
        dayOfWeek: true,
        isClosed: true,
      },
    }),
    prisma.businessHours.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ dayOfWeek: "asc" }, { openTime: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        openTime: true,
        closeTime: true,
      },
    }),
  ]);

  return {
    business,
    businessHours: normalizeBusinessHoursDays(businessHourDays, businessHours),
  };
}

export async function getAdminCalendar() {
  const business = await getAdminBusinessSummary();

  if (!business) {
    return null;
  }

  const [staffMembers, businessHourDays, businessHours, appointments, blackoutDates] = await Promise.all([
    prisma.staffMember.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        title: true,
        isActive: true,
        sortOrder: true,
        availabilities: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isOff: true,
          },
        },
      },
    }),
    prisma.businessHoursDay.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: {
        dayOfWeek: "asc",
      },
      select: {
        id: true,
        dayOfWeek: true,
        isClosed: true,
      },
    }),
    prisma.businessHours.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ dayOfWeek: "asc" }, { openTime: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        openTime: true,
        closeTime: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        confirmationCode: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        notes: true,
        status: true,
        startAt: true,
        endAt: true,
        service: {
          select: {
            name: true,
            durationMinutes: true,
            bufferMinutes: true,
          },
        },
        staffMember: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.blackoutDate.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ startsAt: "asc" }, { endsAt: "asc" }],
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        reason: true,
        staffMemberId: true,
        staffMember: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    business,
    staffMembers,
    businessHours: normalizeBusinessHoursDays(businessHourDays, businessHours),
    appointments,
    blackoutDates,
  };
}
