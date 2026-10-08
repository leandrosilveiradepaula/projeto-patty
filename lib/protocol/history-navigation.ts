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
 * The newest editable draft and the newest published version are different
 * facts. Publication is a manual, version-specific event.
 */
export function latestPublishedProtocolVersionId(
  versions: readonly ProtocolHistoryVersion[],
  publications: readonly { protocol_version_id: string }[],
): string | null {
  const publishedIds = new Set(
    publications.map((publication) => publication.protocol_version_id),
  );

  return [...versions]
    .sort((a, b) => b.version_number - a.version_number)
    .find((version) => publishedIds.has(version.id))?.id ?? null;
}
