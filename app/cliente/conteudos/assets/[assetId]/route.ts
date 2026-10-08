import { issueSignedToken, presignUrl } from "@vercel/blob";

import { requireRole } from "@/lib/supabase/auth";
import { getAccessibleEducationalContentAssetForCurrentClient } from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

type ClientEducationalContentAssetRouteProps = {
  params: Promise<{
    assetId: string;
  }>;
};

const PRIVATE_BLOB_URL_TTL_MS = 5 * 60 * 1000;

export async function GET(
  _request: Request,
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

  try {
    const validUntil = Date.now() + PRIVATE_BLOB_URL_TTL_MS;
    const token = await issueSignedToken({
      operations: ["get"],
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname: asset.storage_path,
      validUntil,
    });

    return new Response(null, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
        Location: presignedUrl,
      },
    });
  } catch {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }
}
