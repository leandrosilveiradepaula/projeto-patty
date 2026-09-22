import { requireRole } from "@/lib/supabase/auth";
import { getAccessiblePhotoFileForAdminViewing } from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

type AdminPhotoRouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: AdminPhotoRouteProps,
) {
  await requireRole("admin");

  const { fileId } = await params;

  if (!isUuid(fileId)) {
    return new Response(null, { status: 404 });
  }

  const file = await getAccessiblePhotoFileForAdminViewing(fileId);

  if (!file) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(file.bucket_id)
    .createSignedUrl(file.object_path, 300);

  if (error || !data?.signedUrl) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: data.signedUrl,
    },
  });
}
