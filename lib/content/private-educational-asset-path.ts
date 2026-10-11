import { randomUUID } from "node:crypto";

/**
 * Bind every private educational upload to the content and version that
 * requested it. Unique paths allow safe retry after an abandoned Blob PUT.
 * The legacy deterministic path stays recognizable for outstanding grants.
 */
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

function pathParts(contentId: string, versionId: string, contentType: string) {
  const extension = EXTENSIONS[contentType];
  return extension ? {
    prefix: `educational-${contentId}-${versionId}-`,
    tail: `-primary.${extension}`,
    extension,
  } : null;
}

export function createEducationalAssetUploadPath(input: {
  contentId: string;
  versionId: string;
  contentType: string;
}): string | null {
  const parts = pathParts(input.contentId, input.versionId, input.contentType);
  return parts ? parts.prefix + randomUUID() + parts.tail : null;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A form POST cannot attach an unrelated Blob, even with admin privileges. */
export function isEducationalAssetUploadPathForVersion(input: {
  contentId: string;
  versionId: string;
  contentType: string;
  storagePath: string;
}): boolean {
  const parts = pathParts(input.contentId, input.versionId, input.contentType);
  if (!parts) return false;
  if (input.storagePath === parts.prefix + "primary." + parts.extension) return true;
  if (!input.storagePath.startsWith(parts.prefix) || !input.storagePath.endsWith(parts.tail)) return false;
  return UUID_V4.test(input.storagePath.slice(parts.prefix.length, -parts.tail.length));
}
