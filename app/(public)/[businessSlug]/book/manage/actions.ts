"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { buildPublicBusinessPath, normalizeBusinessSlug } from "@/lib/tenant";
import { manageBookingLookupSchema } from "@/lib/validation";

import type { ManageBookingLookupActionState } from "./manage-booking-form";

export async function findBookingAction(
  _previousState: ManageBookingLookupActionState,
  formData: FormData,
): Promise<ManageBookingLookupActionState> {
  const locale = normalizeLocale(formData.get("locale"));

  try {
    const parsedInput = manageBookingLookupSchema.parse({
      businessSlug: formData.get("businessSlug"),
      confirmationCode: formData.get("confirmationCode"),
      customerEmail: formData.get("customerEmail"),
    });

    const appointment = await prisma.appointment.findFirst({
      where: {
        confirmationCode: parsedInput.confirmationCode.toUpperCase(),
        customerEmail: parsedInput.customerEmail.toLowerCase(),
        business: {
          slug: normalizeBusinessSlug(parsedInput.businessSlug),
        },
      },
      select: {
        id: true,
      },
    });

    if (!appointment) {
      return {
        status: "error",
        message: t(locale, "public.manage.notFound"),
      };
    }

    redirect(
      buildPublicBusinessPath(
        normalizeBusinessSlug(parsedInput.businessSlug),
        `/book/confirmation/${appointment.id}`,
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: t(locale, "public.manage.invalidLookup"),
      };
    }

    throw error;
  }
}
