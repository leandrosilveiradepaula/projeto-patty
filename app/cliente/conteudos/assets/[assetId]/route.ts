import { get } from "@vercel/blob";

import { requireRole } from "@/lib/supabase/auth";
import { getAccessibleEducationalContentAssetForCurrentClient } from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

type ClientEducationalContentAssetRouteProps = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: ClientEducationalContentAssetRouteProps,
) {
  await requireRole("client");

  const { assetId } = await params;

  if (!isUuid(assetId)) {
    return new Response(null, { status: 404 });
  }

  const asset = await getAccessibleEducationalContentAssetForCurrentClient(assetId);

  if (!asset || asset.storage_provider !== "vercel_blob") {
    return new Response(null, { status: 404 });
  }

  let blob;

  try {
    blob = await get(asset.storage_path, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
      ifModifiedSince: request.headers.get("if-modified-since") ?? undefined,
    });
  } catch {
    return new Response(null, { status: 404 });
  }

  if (!blob) {
    return new Response(null, { status: 404 });
  }

  if (blob.statusCode === 304) {
    return new Response(null, {
      status: 304,
      headers: {
        "Cache-Control": "private, no-store",
        ETag: blob.etag,
      },
    });
  }

  return new Response(blob.stream, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "Content-Length": String(blob.blob.size),
      "Content-Type": asset.content_type,
      ETag: blob.etag,
    },
  });
}
