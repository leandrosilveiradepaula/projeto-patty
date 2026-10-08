export type VersionPublicationSummary<T> = {
  latestVersion: T;
  latestPublishedVersion: T | null;
};

/**
 * A new draft does not unpublish an earlier version.
 * This projection is for the admin library only; it never changes releases.
 */
export function summarizeLibraryVersions<
  T extends { published_at: string | null; version_number: number },
>(
  versions: readonly T[],
  getLibraryItemId: (version: T) => string,
): Map<string, VersionPublicationSummary<T>> {
  const summaries = new Map<string, VersionPublicationSummary<T>>();

  for (const version of versions) {
    const key = getLibraryItemId(version);
    const current = summaries.get(key);

    if (!current) {
      summaries.set(key, {
        latestVersion: version,
        latestPublishedVersion: version.published_at ? version : null,
      });
      continue;
    }

    if (version.version_number > current.latestVersion.version_number) {
      current.latestVersion = version;
    }
    if (
      version.published_at &&
      (!current.latestPublishedVersion ||
        version.version_number > current.latestPublishedVersion.version_number)
    ) {
      current.latestPublishedVersion = version;
    }
  }

  return summaries;
}

export type LibraryStatusFilter = "all" | "draft" | "published";

export function matchesLibraryStatus<T extends { published_at: string | null }>(
  summary: VersionPublicationSummary<T>,
  filter: LibraryStatusFilter,
): boolean {
  if (filter === "published") {
    return summary.latestPublishedVersion !== null;
  }
  if (filter === "draft") {
    return !summary.latestVersion.published_at;
  }
  return true;
}
