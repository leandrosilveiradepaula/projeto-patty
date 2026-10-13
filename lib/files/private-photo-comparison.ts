import { privateFileSaoPauloDay } from "./private-file-calendar.ts";
/** Only photo assets already returned by a scoped file query are comparison candidates. */
export type PrivatePhotoCandidate = {
  id: string;
  client_id: string;
  file_kind: string;
  mime_type: string | null;
  original_filename: string | null;
  created_at: string;
};

const INLINE_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function eligiblePrivatePhotos<T extends PrivatePhotoCandidate>(
  files: readonly T[],
  expectedClientId: string,
): T[] {
  return files
    .filter((file) =>
      file.client_id === expectedClientId &&
      file.file_kind === "photo" &&
      INLINE_PHOTO_MIMES.has(file.mime_type ?? ""),
    )
    .sort((a, b) => {
      const left = Date.parse(a.created_at);
      const right = Date.parse(b.created_at);
      const first = Number.isFinite(left) ? left : -Infinity;
      const second = Number.isFinite(right) ? right : -Infinity;
      if (first === -Infinity || second === -Infinity) {
        return first === -Infinity
          ? second === -Infinity ? a.id.localeCompare(b.id) : 1
          : -1;
      }
      return second - first || a.id.localeCompare(b.id);
    });
}

export type PrivatePhotoPair<T extends PrivatePhotoCandidate> =
  | { state: "unselected" }
  | { state: "invalid" }
  | { state: "ready"; before: T; after: T };

/**
 * The URL contains only opaque IDs. Never use those IDs to fetch files here:
 * selection must resolve exclusively against the authorized client's list.
 */
export function resolvePrivatePhotoPair<T extends PrivatePhotoCandidate>(
  eligiblePhotos: readonly T[],
  beforeId: unknown,
  afterId: unknown,
): PrivatePhotoPair<T> {
  if (beforeId === undefined && afterId === undefined) return { state: "unselected" };
  if (typeof beforeId !== "string" || typeof afterId !== "string" ||
      beforeId.length === 0 || afterId.length === 0 || beforeId === afterId) {
    return { state: "invalid" };
  }
  const before = eligiblePhotos.find((file) => file.id === beforeId);
  const after = eligiblePhotos.find((file) => file.id === afterId);
  if (!before || !after) return { state: "invalid" };
  return { state: "ready", before, after };
}

export function privatePhotoDisplayDate(value: string): string {
  return privateFileSaoPauloDay(value) ?? "Data indisponível";
}
export function privatePhotoPosition<T extends PrivatePhotoCandidate>(photos: readonly T[], id: string): number {
  return photos.findIndex(photo=>photo.id===id);
}
export function adjacentPrivatePhoto<T extends PrivatePhotoCandidate>(
  photos: readonly T[], id: string, movement: -1 | 1,
): T | null {
  const index = privatePhotoPosition(photos,id);
  const next = index + movement;
  return index >= 0 && next >= 0 && next < photos.length ? photos[next] : null;
}
