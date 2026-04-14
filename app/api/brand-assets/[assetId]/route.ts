import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ assetId: string }>;
  },
) {
  const { assetId } = await params;
  const asset = await prisma.brandAsset.findUnique({
    where: {
      id: assetId,
    },
    select: {
      data: true,
      mimeType: true,
      sizeBytes: true,
      updatedAt: true,
      originalFilename: true,
    },
  });

  if (!asset) {
    return new Response("Asset not found.", {
      status: 404,
    });
  }

  return new Response(asset.data, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": `${asset.sizeBytes}`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": asset.updatedAt.toUTCString(),
      "Content-Disposition": `inline; filename="${asset.originalFilename}"`,
    },
  });
}
