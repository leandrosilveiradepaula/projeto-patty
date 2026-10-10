export type PublishedTrainingVersion = {
  id: string;
  published_at: string | null;
};

/**
 * Publication is a version-specific, human-controlled event. The highest
 * version number is not necessarily the last publication.
 * Never mutate the input (it may be reused in administrative history).
 */
export function publishedTrainingVersions<T extends PublishedTrainingVersion>(
  versions: readonly T[],
): T[] {
  return versions
    .filter((version): version is T & { published_at: string } =>
      typeof version.published_at === "string" && version.published_at.length > 0,
    )
    .sort((left, right) => {
      // Compare publication instants, not ISO text: different offsets can
      // reverse the chronological order of independently published versions.
      const leftAt = Date.parse(left.published_at);
      const rightAt = Date.parse(right.published_at);
      const a = Number.isFinite(leftAt) ? leftAt : -Infinity;
      const b = Number.isFinite(rightAt) ? rightAt : -Infinity;
      return b - a || left.id.localeCompare(right.id);
    });
}

export function latestPublishedTrainingVersion<T extends PublishedTrainingVersion>(
  versions: readonly T[],
): T | null {
  return publishedTrainingVersions(versions)[0] ?? null;
}
