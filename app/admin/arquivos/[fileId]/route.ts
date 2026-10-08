import { requireRole } from "@/lib/supabase/auth";
import { isPreviewablePrivateFileMimeType } from "@/lib/files/private-file-preview";
import {
  getAccessiblePrivateFileForAdminDownload,
  recordClientFileAccessEvent,
} from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

type AdminPrivateFileRouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: AdminPrivateFileRouteProps,
) {
  const auth = await requireRole("admin");

  const { fileId } = await params;

  if (!isUuid(fileId)) {
    return new Response(null, { status: 404 });
  }

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const file = await getAccessiblePrivateFileForAdminDownload(fileId);

  if (!file || (preview && !isPreviewablePrivateFileMimeType(file.mime_type))) {
    try {
      await recordClientFileAccessEvent({
        action: preview ? "view" : "download",
        actorProfileId: auth.profileId,
        authorized: false,
        fileKind: null,
        requestedFileId: fileId,
      });
    } catch {
      // A denied request still returns 404 without exposing audit failures.
    }

    return new Response(null, { status: 404 });
  }

  if (file.file_kind === "exam" || file.file_kind === "document") {
    try {
      await recordClientFileAccessEvent({
        action: preview ? "view" : "download",
        actorProfileId: auth.profileId,
        authorized: true,
        fileKind: file.file_kind,
        requestedFileId: fileId,
      });
    } catch {
      return new Response(null, { status: 404 });
    }
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
