export type ProtocolHistoryVersion = {
  id: string;
  version_number: number;
};

export function requestedProtocolVersion(
  requested: unknown,
  versions: readonly ProtocolHistoryVersion[],
): number | null {
  if (typeof requested !== "string" || !/^[1-9]\d*$/.test(requested)) {
    return null;
  }

  const number = Number(requested);
  if (!Number.isSafeInteger(number)) return null;

  return versions.some((version) => version.version_number === number)
    ? number
    : null;
}

/**
 * The newest draft/version and the most recently published version are different
 * facts. Publication is a manual, version-specific event.
 */
export function latestPublishedProtocolVersionId(
  versions: readonly ProtocolHistoryVersion[],
  publications: readonly {
    id: string;
    protocol_version_id: string;
    published_at: string;
  }[],
): string | null {
  const validVersionIds = new Set(versions.map((version) => version.id));
  return [...publications]
    .filter((publication) => validVersionIds.has(publication.protocol_version_id))
    .sort(
      (a, b) =>
        b.published_at.localeCompare(a.published_at) ||
        a.id.localeCompare(b.id),
    )[0]?.protocol_version_id ?? null;
}
