import { randomUUID } from "node:crypto";

import { createPrivateBlobUploadUrl } from "@/lib/content/private-blob-upload-url";
import { EXERCISE_VERSION_VIDEO_CONTENT_TYPE } from "@/lib/training/exercise-version-video";
import { requireRole } from "@/lib/supabase/auth";
import {
  getAccessibleExerciseForCurrentAdmin,
  getAccessibleExerciseVersionVideoForCurrentAdmin,
  listExerciseVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

type Props = { params: Promise<{ exerciseId: string }> };

function isRequestBody(value: unknown): value is { byteSize: number; contentType: string; versionId: string } {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return typeof body.byteSize === "number" && Number.isSafeInteger(body.byteSize) && body.byteSize > 0 &&
    body.contentType === EXERCISE_VERSION_VIDEO_CONTENT_TYPE && typeof body.versionId === "string";
}

export async function POST(request: Request, { params }: Props) {
  await requireRole("admin");
  const { exerciseId } = await params;
  if (!isUuid(exerciseId)) return Response.json({ error: "Exercício inválido" }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Payload inválido" }, { status: 400 }); }
  if (!isRequestBody(body) || !isUuid(body.versionId)) {
    return Response.json({ error: "Dados do vídeo inválidos" }, { status: 400 });
  }

  const exercise = await getAccessibleExerciseForCurrentAdmin(exerciseId);
  if (!exercise) return Response.json({ error: "Exercício não encontrado" }, { status: 404 });
  const versions = await listExerciseVersionsForCurrentAdmin(exerciseId);
  const version = versions.find((item) => item.id === body.versionId);
  if (!version || version.published_at !== null) {
    return Response.json({ error: "A versão precisa estar em rascunho para receber um vídeo" }, { status: 409 });
  }
  if (await getAccessibleExerciseVersionVideoForCurrentAdmin(body.versionId)) {
    return Response.json({ error: "Esta versão já possui vídeo registrado" }, { status: 409 });
  }

  const pathname = `exercise-videos/${randomUUID()}.mp4`;
  try {
    const upload = await createPrivateBlobUploadUrl({
      contentType: EXERCISE_VERSION_VIDEO_CONTENT_TYPE,
      maximumSizeInBytes: body.byteSize,
      pathname,
    });
    return Response.json({ expiresAt: upload.expiresAt, pathname, uploadUrl: upload.presignedUrl }, {
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return Response.json({ error: "Não foi possível preparar o upload privado" }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
