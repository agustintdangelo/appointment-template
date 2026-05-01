import { NextResponse } from "next/server";

import { saveBrandingFromFormData } from "@/lib/branding-admin";
import { t } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await saveBrandingFromFormData(formData);

    return NextResponse.json(result, {
      status: result.status === "success" ? 200 : 400,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("es", "actions.brandingRequestReadError");

    return NextResponse.json(
      {
        status: "error",
        message,
        fieldErrors: {},
        savedBranding: null,
        savedAssets: null,
      },
      {
        status: 400,
      },
    );
  }
}
