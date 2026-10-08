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
    .sort((left, right) =>
      right.published_at.localeCompare(left.published_at) ||
      left.id.localeCompare(right.id),
    );
}

export function latestPublishedTrainingVersion<T extends PublishedTrainingVersion>(
  versions: readonly T[],
): T | null {
  return publishedTrainingVersions(versions)[0] ?? null;
}
