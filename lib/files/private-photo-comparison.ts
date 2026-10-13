import { privateFileSaoPauloDay } from "./private-file-calendar.ts";
/** Only photo assets already returned by a scoped file query are comparison candidates. */
export type PrivatePhotoCandidate = {
  id: string;
  client_id: string;
  file_kind: string;
  mime_type: string | null;
  original_filename: string | null;
  created_at: string;
  byte_size?: number | null;
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
      INLINE_PHOTO_MIMES.has(file.mime_type?.trim().toLowerCase() ?? ""),
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
  | { state: "partial"; beforeId: string | null; afterId: string | null }
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
  const isSelected = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 128;
  const hasBefore = isSelected(beforeId);
  const hasAfter = isSelected(afterId);
  if (hasBefore !== hasAfter && (beforeId === undefined || beforeId === "") !== (afterId === undefined || afterId === "")) {
    const id = (hasBefore ? beforeId : afterId) as string;
    if (!eligiblePhotos.some(photo => photo.id === id)) return { state: "invalid" };
    return { state: "partial", beforeId: hasBefore ? id : null, afterId: hasAfter ? id : null };
  }
  if (!hasBefore || !hasAfter || beforeId === afterId) return { state: "invalid" };
  const before = eligiblePhotos.find(photo => photo.id === beforeId);
  const after = eligiblePhotos.find(photo => photo.id === afterId);
  return before && after ? { state: "ready", before, after } : { state: "invalid" };
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

/** Filter/selection navigation does not fetch records: IDs are checked against the caller's authorized photo list. */
export function adjacentDistinctPrivatePhoto<T extends PrivatePhotoCandidate>(
  photos: readonly T[], id: string, excludedId: string, direction: -1 | 1,
): T | null {
  let next = privatePhotoPosition(photos,id);
  if (next < 0) return null;
  while (true) {
    next += direction;
    if (next < 0 || next >= photos.length) return null;
    if (photos[next].id !== excludedId) return photos[next];
  }
}
export function privatePhotoPairPresets<T extends PrivatePhotoCandidate>(photos: readonly T[]) {
  if (photos.length < 2) return null;
  const dated = photos.filter(photo => Number.isFinite(Date.parse(photo.created_at)));
  return {
    newest: { before: photos[1].id, after: photos[0].id },
    extremes: dated.length >= 2
      ? { before: dated[dated.length - 1].id, after: dated[0].id }
      : null,
  };
}
/** The contextHref comes only from the allowlisted server-built history URL, never from user input. */
export function privatePhotoSelectionHref(contextHref: string, beforeId?: string | null, afterId?: string | null): string {
  const base = contextHref.split("#",1)[0];
  const question = base.indexOf("?");
  const route = question < 0 ? base : base.slice(0,question);
  const params = new URLSearchParams(question < 0 ? "" : base.slice(question+1));
  params.delete("fotoAntes");
  params.delete("fotoDepois");
  if (beforeId) params.set("fotoAntes",beforeId);
  if (afterId) params.set("fotoDepois",afterId);
  const query = params.toString();
  return route + (query ? "?" + query : "") + "#comparar-fotos";
}
