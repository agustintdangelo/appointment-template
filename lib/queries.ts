import { prisma } from "@/lib/prisma";
import { dayOptions } from "@/lib/admin";

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

  const hours = await prisma.businessHours.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: {
      dayOfWeek: "asc",
    },
    select: {
      id: true,
      dayOfWeek: true,
      openTime: true,
      closeTime: true,
      isClosed: true,
    },
  });

  const hoursByDay = new Map(hours.map((entry) => [entry.dayOfWeek, entry]));
  const businessHours = dayOptions.map((day) => {
    const existingEntry = hoursByDay.get(day.value);

    if (existingEntry) {
      return existingEntry;
    }

    return {
      id: `${day.value}`,
      dayOfWeek: day.value,
      openTime: "09:00",
      closeTime: "17:00",
      isClosed: day.value === 0,
    };
  });

  return {
    business,
    businessHours,
  };
}

export async function getAdminBlackoutDates() {
  const business = await getAdminBusinessSummary();

  if (!business) {
    return null;
  }

  const [staffMembers, blackoutDates] = await Promise.all([
    prisma.staffMember.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
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
    blackoutDates,
  };
}
