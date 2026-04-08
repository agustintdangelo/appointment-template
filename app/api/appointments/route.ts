import { AppointmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createConfirmationCode, getDailyAvailability } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawPayload = (await request.json()) as unknown;
    const payload = bookingSchema.parse(rawPayload);
    const availability = await getDailyAvailability(payload);
    const matchingSlot = availability.slots.find(
      (slot) => slot.startAt.toISOString() === payload.slotStart,
    );

    if (!matchingSlot) {
      return NextResponse.json(
        { error: "That slot is no longer available. Please choose another one." },
        {
          status: 409,
        },
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: payload.businessId,
        serviceId: payload.serviceId,
        staffMemberId: payload.staffMemberId,
        customerName: payload.customerName.trim(),
        customerEmail: payload.customerEmail.trim().toLowerCase(),
        customerPhone: payload.customerPhone?.trim() || null,
        notes: payload.notes?.trim() || null,
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: createConfirmationCode(),
        startAt: matchingSlot.startAt,
        endAt: matchingSlot.endAt,
      },
      select: {
        id: true,
      },
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
      return NextResponse.json({ error: "Invalid booking payload." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to create appointment." }, { status: 500 });
  }
}
