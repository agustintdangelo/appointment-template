import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { buildPublicBusinessPath } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function LegacyBookingConfirmationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    select: {
      business: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!appointment) {
    notFound();
  }

  redirect(
    buildPublicBusinessPath(appointment.business.slug, `/book/confirmation/${appointmentId}`),
  );
}
