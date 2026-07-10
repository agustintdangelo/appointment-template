import { AppointmentBookingType, CustomerAuthProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { bookAppointmentSlot } from "@/lib/booking";
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

    const authenticatedCustomer = await getAuthenticatedCustomer();
    const bookingType = authenticatedCustomer
      ? getBookingTypeFromCustomerProvider(authenticatedCustomer.authProvider)
      : AppointmentBookingType.GUEST;

    const result = await bookAppointmentSlot(
      {
        businessId: business.id,
        serviceId: payload.serviceId,
        staffMemberId: payload.staffMemberId,
        date: payload.date,
        slotStart: payload.slotStart,
        customerId: authenticatedCustomer?.id ?? null,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        notes: payload.notes,
        bookingType,
        guestFullName: authenticatedCustomer ? null : payload.customerName,
        guestEmail: authenticatedCustomer ? null : payload.customerEmail,
        guestPhone: authenticatedCustomer ? null : payload.customerPhone,
      },
      locale,
    );

    if (result.status === "slot-unavailable") {
      return NextResponse.json(
        { error: t(locale, "validation.slotUnavailable") },
        { status: 409 },
      );
    }

    const appointment = result.appointment;

    prepareAppointmentConfirmation({
      appointment,
      managementToken: result.managementToken,
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
