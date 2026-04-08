import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { AppointmentStatus, PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

function nextOpenDate(minOffsetDays = 1) {
  const date = new Date();
  date.setDate(date.getDate() + minOffsetDays);
  date.setHours(0, 0, 0, 0);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function withTime(date, hours, minutes = 0) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

async function main() {
  await prisma.appointment.deleteMany();
  await prisma.blackoutDate.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.service.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Studio Hours Demo",
      slug: "studio-hours-demo",
      timezone: "America/New_York",
      phone: "(212) 555-0198",
      email: "hello@studiohoursdemo.com",
      description:
        "A reusable appointment-booking template seeded with a polished nail studio demo.",
      heroHeadline: "Calm booking for clients. Clear scheduling for the team.",
      heroSubheadline:
        "This demo shows how the template can feel branded without baking vertical-specific logic into the core product.",
    },
  });

  const services = await Promise.all([
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Signature Manicure",
        slug: "signature-manicure",
        description:
          "A polished core treatment with shaping, cuticle care, and your choice of finish.",
        durationMinutes: 45,
        bufferMinutes: 10,
        priceCents: 3500,
        sortOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Gel Renewal",
        slug: "gel-renewal",
        description:
          "A durable color refresh for guests who want extra wear without extra complexity.",
        durationMinutes: 60,
        bufferMinutes: 10,
        priceCents: 5500,
        sortOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Precision Pedicure",
        slug: "precision-pedicure",
        description:
          "An extended service with detail work, exfoliation, and a finish tailored to the client.",
        durationMinutes: 75,
        bufferMinutes: 15,
        priceCents: 7000,
        sortOrder: 3,
      },
    }),
  ]);

  const staffMembers = await Promise.all([
    prisma.staffMember.create({
      data: {
        businessId: business.id,
        name: "Ava Brooks",
        slug: "ava-brooks",
        title: "Senior Artist",
        bio: "Known for quiet precision and efficient premium appointments.",
        sortOrder: 1,
      },
    }),
    prisma.staffMember.create({
      data: {
        businessId: business.id,
        name: "Jade Torres",
        slug: "jade-torres",
        title: "Color Specialist",
        bio: "Focused on durable finishes and sharp service pacing.",
        sortOrder: 2,
      },
    }),
    prisma.staffMember.create({
      data: {
        businessId: business.id,
        name: "Mila Hart",
        slug: "mila-hart",
        title: "Guest Care Lead",
        bio: "Balances hospitality with detail-heavy treatment sessions.",
        sortOrder: 3,
      },
    }),
  ]);

  await prisma.businessHours.createMany({
    data: [
      {
        businessId: business.id,
        dayOfWeek: 0,
        openTime: "00:00",
        closeTime: "00:00",
        isClosed: true,
      },
      {
        businessId: business.id,
        dayOfWeek: 1,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 2,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 3,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 4,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 5,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 6,
        openTime: "10:00",
        closeTime: "16:00",
        isClosed: false,
      },
    ],
  });

  const availabilityTemplate = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 6, startTime: "10:00", endTime: "15:00" },
  ];

  for (const staffMember of staffMembers) {
    await prisma.staffAvailability.createMany({
      data: availabilityTemplate.map((entry) => ({
        staffMemberId: staffMember.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      })),
    });
  }

  const firstOpenDate = nextOpenDate(1);
  const secondOpenDate = nextOpenDate(2);
  const thirdOpenDate = nextOpenDate(3);

  await prisma.blackoutDate.createMany({
    data: [
      {
        businessId: business.id,
        startsAt: withTime(secondOpenDate, 13, 0),
        endsAt: withTime(secondOpenDate, 14, 0),
        reason: "Studio reset window",
      },
      {
        businessId: business.id,
        staffMemberId: staffMembers[2].id,
        startsAt: withTime(thirdOpenDate, 11, 0),
        endsAt: withTime(thirdOpenDate, 13, 0),
        reason: "Private training block",
      },
    ],
  });

  await prisma.adminUser.create({
    data: {
      businessId: business.id,
      name: "Studio Admin",
      email: "admin@studiohoursdemo.com",
      passwordHash: "placeholder-admin-password-hash",
    },
  });

  await prisma.appointment.createMany({
    data: [
      {
        businessId: business.id,
        serviceId: services[0].id,
        staffMemberId: staffMembers[0].id,
        customerName: "Mia Carter",
        customerEmail: "mia@example.com",
        customerPhone: "555-0101",
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: "DEMO-A1",
        startAt: withTime(firstOpenDate, 10, 0),
        endAt: withTime(firstOpenDate, 10, 45),
      },
      {
        businessId: business.id,
        serviceId: services[1].id,
        staffMemberId: staffMembers[1].id,
        customerName: "Nora Ellis",
        customerEmail: "nora@example.com",
        customerPhone: "555-0102",
        status: AppointmentStatus.PENDING,
        confirmationCode: "DEMO-B2",
        startAt: withTime(firstOpenDate, 13, 30),
        endAt: withTime(firstOpenDate, 14, 30),
      },
      {
        businessId: business.id,
        serviceId: services[2].id,
        staffMemberId: staffMembers[2].id,
        customerName: "Ella Romero",
        customerEmail: "ella@example.com",
        customerPhone: "555-0103",
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: "DEMO-C3",
        startAt: withTime(secondOpenDate, 10, 30),
        endAt: withTime(secondOpenDate, 11, 45),
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
