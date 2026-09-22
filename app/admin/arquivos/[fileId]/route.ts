import { requireRole } from "@/lib/supabase/auth";
import {\n  getAccessiblePrivateFileForAdminDownload,\n  recordClientFileAccessEvent,\n} from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

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

  if (!isUuid(fileId)) {
    return new Response(null, { status: 404 });
  }

  const file = await getAccessiblePrivateFileForAdminDownload(fileId);

  if (!file) {
    try {
      await recordClientFileAccessEvent({
        action: "download",
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
        action: "download",
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
