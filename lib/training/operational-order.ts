export type TrainingRequestOrdering = {
  id: string;
  requested_at: string;
};

/** Most recent request first, regardless of database result order. */
export function newestTrainingRequests<T extends TrainingRequestOrdering>(
  requests: readonly T[],
): T[] {
  return [...requests].sort((left, right) => {
    const leftAt = Date.parse(left.requested_at);
    const rightAt = Date.parse(right.requested_at);
    const a = Number.isFinite(leftAt) ? leftAt : -Infinity;
    const b = Number.isFinite(rightAt) ? rightAt : -Infinity;
    return b - a || left.id.localeCompare(right.id);
  });
}

export type TrainingVersionOrdering = {
  id: string;
  published_at: string | null;
  version_number: number;
};

export function newestUnpublishedTrainingVersion<T extends TrainingVersionOrdering>(
  versions: readonly T[],
): T | null {
  return [...versions]
    .filter((version) => !version.published_at)
    .sort((left, right) => right.version_number - left.version_number || left.id.localeCompare(right.id))[0] ?? null;
}
