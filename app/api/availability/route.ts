import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getDailyAvailability } from "@/lib/booking";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { normalizeBusinessSlug } from "@/lib/tenant";
import { availabilityQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));

  try {
    const parsedQuery = availabilityQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const business = await prisma.business.findUnique({
      where: {
        slug: normalizeBusinessSlug(parsedQuery.businessSlug),
      },
      select: {
        id: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: t(locale, "validation.businessNotFound") },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const availability = await getDailyAvailability(
      {
        businessId: business.id,
        serviceId: parsedQuery.serviceId,
        staffMemberId: parsedQuery.staffMemberId,
        date: parsedQuery.date,
      },
      locale,
    );

    return NextResponse.json(
      {
        slots: availability.slots.map((slot) => ({
          startAt: slot.startAt.toISOString(),
          endAt: slot.endAt.toISOString(),
          label: slot.label,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: t(locale, "validation.invalidAvailability") },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (error instanceof Error && error.message === "SERVICE_NOT_FOUND") {
      return NextResponse.json(
        { error: t(locale, "validation.serviceNotFound") },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (error instanceof Error && error.message === "STAFF_NOT_FOUND") {
      return NextResponse.json(
        { error: t(locale, "validation.staffNotFound") },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { error: t(locale, "validation.unableAvailability") },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
