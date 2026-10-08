import { requireRole } from "@/lib/supabase/auth";
import { createPrivateBlobReadUrl } from "@/lib/content/private-blob-url";
import { getAccessibleEducationalContentAssetForCurrentClient } from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

type ClientEducationalContentAssetRouteProps = {
  params: Promise<{
    assetId: string;
  }>;
};

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
    const presignedUrl = await createPrivateBlobReadUrl(asset.storage_path);

    return new Response(null, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
        Location: presignedUrl,
        "Referrer-Policy": "no-referrer",
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
