import { createPrivateBlobUploadUrl } from "@/lib/content/private-blob-upload-url";
import { requireRole } from "@/lib/supabase/auth";
import {
  getAccessibleEducationalContentForCurrentAdmin,
  listEducationalContentAssetsForCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

type AdminEducationalContentUploadRouteProps = {
  params: Promise<{
    contentId: string;
  }>;
};

const EXTENSION_BY_CONTENT_TYPE = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
]);

function isUploadRequestBody(value: unknown): value is {
  byteSize: number;
  contentType: string;
  versionId: string;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.byteSize === "number" &&
    Number.isSafeInteger(candidate.byteSize) &&
    candidate.byteSize > 0 &&
    typeof candidate.contentType === "string" &&
    typeof candidate.versionId === "string"
  );
}

export async function POST(
  request: Request,
  { params }: AdminEducationalContentUploadRouteProps,
) {
  await requireRole("admin");

  const { contentId } = await params;

  if (!isUuid(contentId)) {
    return Response.json({ error: "Conteúdo inválido" }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (!isUploadRequestBody(body) || !isUuid(body.versionId)) {
    return Response.json({ error: "Dados do arquivo inválidos" }, { status: 400 });
  }

  const extension = EXTENSION_BY_CONTENT_TYPE.get(body.contentType);

  if (!extension) {
    return Response.json(
      { error: "Tipo de arquivo não permitido para a biblioteca educacional" },
      { status: 400 },
    );
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    return Response.json({ error: "Conteúdo não encontrado" }, { status: 404 });
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(contentId);
  const version = versions.find((item) => item.id === body.versionId);

  if (!version || version.published_at !== null) {
    return Response.json(
      { error: "A versão precisa estar em rascunho para receber um arquivo" },
      { status: 409 },
    );
  }

  const existingAssets = await listEducationalContentAssetsForCurrentAdmin(
    body.versionId,
  );

  if (existingAssets.length > 0) {
    return Response.json(
      { error: "Esta versão já possui asset registrado" },
      { status: 409 },
    );
  }

  const pathname =
    `educational-${contentId}-${body.versionId}-primary.${extension}`;

  try {
    const upload = await createPrivateBlobUploadUrl({
      contentType: body.contentType,
      maximumSizeInBytes: body.byteSize,
      pathname,
    });

    return Response.json(
      {
        expiresAt: upload.expiresAt,
        pathname,
        uploadUrl: upload.presignedUrl,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível preparar o upload privado" },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
