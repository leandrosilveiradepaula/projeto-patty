export type ContentReleaseOptionOrder = {
  id: string;
  title: string;
  version_number: number;
};

/** Show content names together and the latest version first within a title. */
export function sortClientContentReleaseOptions<T extends ContentReleaseOptionOrder>(
  versions: readonly T[],
): T[] {
  return [...versions].sort((left, right) =>
    left.title.localeCompare(right.title, "pt-BR", { sensitivity: "base" }) ||
    right.version_number - left.version_number ||
    left.id.localeCompare(right.id),
  );
}

export type ClientContentReleaseOrder = {
  id: string;
  released_at: string;
};

/** Most recently released versions first, without mutating the history. */
export function newestClientContentReleases<T extends ClientContentReleaseOrder>(
  releases: readonly T[],
): T[] {
  return [...releases].sort((left, right) => {
    const a = Date.parse(left.released_at);
    const b = Date.parse(right.released_at);
    const leftAt = Number.isFinite(a) ? a : -Infinity;
    const rightAt = Number.isFinite(b) ? b : -Infinity;
    return rightAt - leftAt || right.id.localeCompare(left.id);
  });
}
