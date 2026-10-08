import { requireRole } from "@/lib/supabase/auth";
import { isPreviewablePrivateFileMimeType } from "@/lib/files/private-file-preview";
import { getAccessiblePrivateFileForCurrentClientDownload } from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

type ClientPrivateFileRouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: ClientPrivateFileRouteProps,
) {
  await requireRole("client");

  const { fileId } = await params;

  if (!isUuid(fileId)) {
    return new Response(null, { status: 404 });
  }

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const file = await getAccessiblePrivateFileForCurrentClientDownload(fileId);

  if (!file || (preview && !isPreviewablePrivateFileMimeType(file.mime_type))) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createClient();
  const downloadName = file.original_filename?.trim() || true;
  const { data, error } = await supabase.storage
    .from(file.bucket_id)
    .createSignedUrl(
      file.object_path,
      preview ? 60 : 300,
      preview ? undefined : { download: downloadName },
    );

  if (error || !data?.signedUrl) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
      Location: data.signedUrl,
    },
  });
}
