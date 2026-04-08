import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getDailyAvailability } from "@/lib/booking";
import { availabilityQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = availabilityQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const availability = await getDailyAvailability(parsedQuery);

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
        { error: "Invalid availability request." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { error: "Unable to load availability." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
