import { requireRole } from "@/lib/supabase/auth";
import { getAccessiblePrivateFileForCurrentClientDownload } from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

type ClientPrivateFileRouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ClientPrivateFileRouteProps,
) {
  await requireRole("client");

  const { fileId } = await params;

  if (!isUuid(fileId)) {
    return new Response(null, { status: 404 });
  }

  const file = await getAccessiblePrivateFileForCurrentClientDownload(fileId);

  if (!file) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createClient();
  const downloadName = file.original_filename?.trim() || true;
  const { data, error } = await supabase.storage
    .from(file.bucket_id)
    .createSignedUrl(file.object_path, 300, {
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
