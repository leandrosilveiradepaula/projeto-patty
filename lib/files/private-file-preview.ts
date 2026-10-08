/** Only MIME types verified by the upload allowlist can be opened inline. */
const PREVIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function isPreviewablePrivateFileMimeType(mimeType: string | null | undefined): boolean {
  return typeof mimeType === "string" && PREVIEWABLE.has(mimeType);
}
