import { createPrivateBlobReadUrl } from "@/lib/content/private-blob-url";
import { hasVerifiedPrivateExerciseVersionVideo } from "@/lib/training/exercise-version-video";
import { requireRole } from "@/lib/supabase/auth";
import { getAccessibleExerciseVersionVideoForCurrentClient } from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export async function GET(_: Request, { params }: { params: Promise<{ videoId: string }> }) {
  await requireRole("client");
  const { videoId } = await params;
  if (!isUuid(videoId)) return new Response(null, { status: 404 });
  const video = await getAccessibleExerciseVersionVideoForCurrentClient(videoId);
  if (!video || !hasVerifiedPrivateExerciseVersionVideo(video)) return new Response(null, { status: 404 });
  try {
    const presignedUrl = await createPrivateBlobReadUrl(video.storage_path);
    return new Response(null, { status: 307, headers: { Location: presignedUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
