/**
 * Browser-only preflight aligned with the private upload grant's accepted
 * content types. It is not authoritative: the server and Blob must still
 * validate the signed upload and verify the registered binary.
 */
export const EDUCATIONAL_ASSET_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
] as const;

type UploadCandidate = { size: number; type: string };

export function validateEducationalAssetUploadSelection(
  file: UploadCandidate | null,
): { ok: true } | { ok: false; message: string } {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0) {
    return { ok: false, message: "Selecione um arquivo não vazio para enviar." };
  }
  if (!(EDUCATIONAL_ASSET_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: "Formato não permitido. Utilize PDF, JPG, PNG, WebP ou MP4.",
    };
  }
  return { ok: true };
}
