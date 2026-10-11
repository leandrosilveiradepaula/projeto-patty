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

export function readExerciseSelectionQuery(raw:unknown):string { return typeof raw==="string" ? raw.trim().slice(0,120):""; }
export function filterPublishedExerciseOptions<T extends PublishedExerciseOption>(options: readonly T[], raw: unknown):T[] {
 const term=readExerciseSelectionQuery(raw).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
 return orderPublishedExerciseOptions(options).filter(e=>e.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").includes(term));
}
export function selectedExerciseOption<T extends PublishedExerciseOption>(options:readonly T[],id:string):T|null { return options.find(option=>option.id===id)??null; }
