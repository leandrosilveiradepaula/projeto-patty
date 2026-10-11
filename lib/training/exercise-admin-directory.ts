export type ExerciseCatalogStatus = "all" | "draft" | "published" | "incomplete";

/** Repeated URL search parameters are arrays, never implicit client queries. */
export function readExerciseCatalogTerm(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function readExerciseCatalogStatus(value: unknown): ExerciseCatalogStatus {
  if (value === "draft" || value === "published" || value === "incomplete") return value;
  return "all";
}

export function normalizeExerciseCatalogTerm(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").trim();
}

type ExerciseNameVersion = { id: string; name: string; version_number: number };

/** Search the complete authorized history, not only the two newest labels. */
export function matchingExerciseNameVersion<T extends ExerciseNameVersion>(
  versions: readonly T[],
  query: string,
): T | null {
  const term = normalizeExerciseCatalogTerm(query);
  if (!term) return null;
  return versions
    .filter((item) => normalizeExerciseCatalogTerm(item.name).includes(term))
    .sort((a, b) => b.version_number - a.version_number || a.id.localeCompare(b.id))[0] ?? null;
}

/** Only the known filters/term can be transported through admin navigation. */
export function exerciseCatalogBackHref(
  term: string,
  status: ExerciseCatalogStatus,
): string {
  const params = new URLSearchParams();
  if (term) params.set("q", readExerciseCatalogTerm(term));
  if (status !== "all") params.set("status", status);
  const search = params.toString();
  return "/admin/exercicios" + (search ? "?" + search : "");
}
