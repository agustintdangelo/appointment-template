import {
  AppointmentBookingType,
  AppointmentStatus,
  CustomerAuthProvider,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createAppointmentManagementToken,
  createConfirmationCode,
  getDailyAvailability,
} from "@/lib/booking";
import { normalizeContactEmail, normalizeContactText } from "@/lib/contact";
import { prepareAppointmentConfirmation } from "@/lib/confirmation";
import { getCustomerAuthSession } from "@/lib/customer-auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { normalizeBusinessSlug } from "@/lib/tenant";
import { bookingSchema } from "@/lib/validation";

export const runtime = "nodejs";

type BookingFieldErrors = Partial<
  Record<"customerName" | "customerEmail" | "customerPhone", string>
>;

function getBookingTypeFromCustomerProvider(provider: CustomerAuthProvider) {
  if (provider === CustomerAuthProvider.GOOGLE) {
    return AppointmentBookingType.GOOGLE;
  }

  return AppointmentBookingType.APPLE;
}

function getBookingFieldErrors(error: ZodError, locale: string) {
  const fieldErrors: BookingFieldErrors = {};

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

async function getAuthenticatedCustomer() {
  const session = await getCustomerAuthSession();
  const customerId = session?.customer?.id;

  if (!customerId) {
    return null;
  }

  return prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      authProvider: true,
    },
  });
}

export async function POST(request: Request) {
  let locale = normalizeLocale(undefined);

  try {
    const rawPayload = (await request.json()) as unknown;
    locale = normalizeLocale(
      typeof rawPayload === "object" && rawPayload !== null && "locale" in rawPayload
        ? (rawPayload as { locale?: unknown }).locale
        : undefined,
    );
    const payload = bookingSchema.parse(rawPayload);
    const business = await prisma.business.findUnique({
      where: {
        slug: normalizeBusinessSlug(payload.businessSlug),
      },
      select: {
        id: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: t(locale, "validation.businessNotFound") },
        { status: 404 },
      );
    }

    const availability = await getDailyAvailability(
      {
        businessId: business.id,
        serviceId: payload.serviceId,
        staffMemberId: payload.staffMemberId,
        date: payload.date,
      },
      locale,
    );
    const matchingSlot = availability.slots.find(
      (slot) => slot.startAt.toISOString() === payload.slotStart,
    );

    if (!matchingSlot) {
      return NextResponse.json(
        { error: t(locale, "validation.slotUnavailable") },
        {
          status: 409,
        },
      );
    }

    const authenticatedCustomer = await getAuthenticatedCustomer();
    const contactName = normalizeContactText(payload.customerName);
    const contactEmail = normalizeContactEmail(payload.customerEmail);
    const contactPhone = normalizeContactText(payload.customerPhone);
    const bookingType = authenticatedCustomer
      ? getBookingTypeFromCustomerProvider(authenticatedCustomer.authProvider)
      : AppointmentBookingType.GUEST;
    const managementToken = createAppointmentManagementToken();

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        serviceId: payload.serviceId,
        staffMemberId: payload.staffMemberId,
        customerId: authenticatedCustomer?.id ?? null,
        customerName: contactName,
        customerEmail: contactEmail,
        customerPhone: contactPhone,
        guestFullName: authenticatedCustomer ? null : contactName,
        guestEmail: authenticatedCustomer ? null : contactEmail,
        guestPhone: authenticatedCustomer ? null : contactPhone,
        contactEmail,
        contactPhone,
        bookingType,
        managementTokenHash: managementToken.tokenHash,
        notes: payload.notes?.trim() || null,
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: createConfirmationCode(),
        startAt: matchingSlot.startAt,
        endAt: matchingSlot.endAt,
      },
      select: {
        id: true,
        confirmationCode: true,
        startAt: true,
        endAt: true,
        customerName: true,
        contactEmail: true,
        contactPhone: true,
        business: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        service: {
          select: {
            name: true,
            durationMinutes: true,
            bufferMinutes: true,
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

    prepareAppointmentConfirmation({
      appointment,
      managementToken: managementToken.token,
    });

    return NextResponse.json(
      {
        appointmentId: appointment.id,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: t(locale, "validation.invalidBooking"),
          fieldErrors: getBookingFieldErrors(error, locale),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "SERVICE_NOT_FOUND") {
      return NextResponse.json(
        { error: t(locale, "validation.serviceNotFound") },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "STAFF_NOT_FOUND") {
      return NextResponse.json(
        { error: t(locale, "validation.staffNotFound") },
        { status: 404 },
      );
    }

    return NextResponse.json({ error: t(locale, "validation.unableCreateAppointment") }, { status: 500 });
  }
}
