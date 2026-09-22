import { requireRole } from "@/lib/supabase/auth";
import { getAccessiblePrivateFileForAdminDownload } from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";

type AdminPrivateFileRouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: AdminPrivateFileRouteProps,
) {
  await requireRole("admin");

  const { fileId } = await params;
  const file = await getAccessiblePrivateFileForAdminDownload(fileId);

  if (!file) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createClient();
  const downloadName = file.original_filename?.trim() || true;
  const { data, error } = await supabase.storage
    .from(file.bucket_id)
    .createSignedUrl(file.object_path, 60, {
      download: downloadName,
    });

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
