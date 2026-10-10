export type ExerciseLibrarySummaryOrder = {
  latestVersion: {
    created_at: string;
    exercise_id: string;
    id: string;
    version_number: number;
  };
};

/**
 * Stable ordering of professional exercise catalogue entries by actual
 * creation instant. Malformed legacy timestamps are shown after valid entries.
 * This sorting never assigns exercises to clients.
 */
export function newestExerciseLibrarySummaries<T extends ExerciseLibrarySummaryOrder>(
  summaries: readonly T[],
): T[] {
  return [...summaries].sort((left, right) => {
    const leftTime = Date.parse(left.latestVersion.created_at);
    const rightTime = Date.parse(right.latestVersion.created_at);
    const validLeft = Number.isFinite(leftTime);
    const validRight = Number.isFinite(rightTime);
    if (validLeft && validRight && leftTime !== rightTime) return rightTime - leftTime;
    if (validLeft !== validRight) return validLeft ? -1 : 1;
    if (left.latestVersion.version_number !== right.latestVersion.version_number) {
      return right.latestVersion.version_number - left.latestVersion.version_number;
    }
    return left.latestVersion.exercise_id.localeCompare(right.latestVersion.exercise_id) ||
      left.latestVersion.id.localeCompare(right.latestVersion.id);
  });
}
