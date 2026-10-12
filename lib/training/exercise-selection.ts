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

/** Filters only the already authorized published catalog, never fetching from the browser. */
export function readExerciseSelectionQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 120) : "";
}

function normalizedExerciseSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function filterPublishedExerciseOptions<T extends PublishedExerciseOption>(
  options: readonly T[],
  rawQuery: unknown,
): T[] {
  const query = normalizedExerciseSearch(readExerciseSelectionQuery(rawQuery));
  return orderPublishedExerciseOptions(options).filter((option) =>
    normalizedExerciseSearch(option.name).includes(query),
  );
}

/** Never replace an explicit version selection with another version of the same exercise. */
export function selectedExerciseOption<T extends PublishedExerciseOption>(
  options: readonly T[],
  versionId: string,
): T | null {
  return options.find((option) => option.id === versionId) ?? null;
}
