export type PublishedExerciseOption = {
  id: string;
  name: string;
  versionNumber: number;
};

/**
 * Present the professional catalogue deterministically. Selection is still
 * explicit and tied to the exact published version ID, not automatically to
 * whichever version was published most recently.
 */
export function orderPublishedExerciseOptions<T extends PublishedExerciseOption>(
  options: readonly T[],
): T[] {
  return [...options].sort((left, right) =>
    left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }) ||
    right.versionNumber - left.versionNumber ||
    left.id.localeCompare(right.id),
  );
}

export function isHistoricalExerciseSelectionUnavailable(
  existingExerciseVersionId: string | null | undefined,
  selectedId: string,
  options: readonly PublishedExerciseOption[],
): boolean {
  return Boolean(
    existingExerciseVersionId &&
    selectedId === existingExerciseVersionId &&
    !options.some((option) => option.id === existingExerciseVersionId),
  );
}
