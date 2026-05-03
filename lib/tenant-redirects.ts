import { redirect } from "next/navigation";

import {
  buildAdminBusinessPath,
  buildPublicBusinessPath,
} from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

async function getPrimaryBusinessSlug() {
  const business = await prisma.business.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      slug: true,
    },
  });

  return business?.slug ?? null;
}

export async function redirectToPrimaryBusiness(path = "") {
  const businessSlug = await getPrimaryBusinessSlug();

  if (!businessSlug) {
    redirect("/");
  }

  redirect(buildPublicBusinessPath(businessSlug, path));
}

export async function redirectToPrimaryAdmin(path = "/calendar") {
  const businessSlug = await getPrimaryBusinessSlug();

  if (!businessSlug) {
    redirect("/");
  }

  redirect(buildAdminBusinessPath(businessSlug, path));
}
