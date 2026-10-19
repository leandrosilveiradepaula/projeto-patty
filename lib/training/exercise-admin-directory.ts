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
  sort: ExerciseCatalogSort = "recent",
  page = 1,
): string {
  const params = new URLSearchParams();
  if (term) params.set("q", readExerciseCatalogTerm(term));
  if (status !== "all") params.set("status", status);
  if (sort !== "recent") params.set("ordem", sort);
  if (Number.isSafeInteger(page) && page > 1) params.set("pagina", String(page));
  const search = params.toString();
  return "/admin/exercicios" + (search ? "?" + search : "");
}

export const EXERCISE_DIRECTORY_PAGE_SIZE = 16;

export function readExerciseDirectoryPage(value: unknown) {
  if (value === undefined) return { page: 1, invalid: false };
  if (typeof value !== "string" || !/^[1-9][0-9]{0,5}$/.test(value)) {
    return { page: 1, invalid: true };
  }
  return { page: Number(value), invalid: false };
}

export function paginateExerciseDirectory<T>(items: readonly T[], requested: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / EXERCISE_DIRECTORY_PAGE_SIZE));
  const page = Number.isSafeInteger(requested) ? Math.min(pageCount, Math.max(1, requested)) : 1;
  const start = (page - 1) * EXERCISE_DIRECTORY_PAGE_SIZE;
  return {
    items: items.slice(start, start + EXERCISE_DIRECTORY_PAGE_SIZE),
    page,
    pageCount,
    total: items.length,
    first: items.length ? start + 1 : 0,
    last: Math.min(items.length, start + EXERCISE_DIRECTORY_PAGE_SIZE),
  };
}

export function exerciseDirectoryPageHref(query: string, status: ExerciseCatalogStatus, page: number, sort: ExerciseCatalogSort = "recent") {
  const params = new URLSearchParams();
  if (query) params.set("q", readExerciseCatalogTerm(query));
  if (status !== "all") params.set("status", status);
  if (sort !== "recent") params.set("ordem", sort);
  if (page > 1 && Number.isSafeInteger(page)) params.set("pagina", String(page));
  const suffix = params.toString();
  return "/admin/exercicios" + (suffix ? "?" + suffix : "") + "#biblioteca-exercicios";
}

/** Strict parsing: unknown and repeated URL values do not affect admin discovery. */
export type ExerciseCatalogSort =
  | "recent" | "oldest" | "name-asc" | "name-desc" | "published" | "versions";

export function readExerciseCatalogSort(raw: unknown): ExerciseCatalogSort {
  return raw === "oldest" || raw === "name-asc" || raw === "name-desc" ||
    raw === "published" || raw === "versions" ? raw : "recent";
}

type ExerciseSortableVersion = {
  exercise_id: string;
  id: string;
  name: string;
  created_at: string;
  published_at: string | null;
  version_number: number;
};
export type ExerciseSortableSummary = {
  latestVersion: ExerciseSortableVersion;
  latestPublishedVersion: ExerciseSortableVersion | null;
  /** Count of the complete RLS-authorized history, not version number. */
  versionCount: number;
};

function sortableInstant(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function compareExerciseDates(
  left: string | null, right: string | null, ascending: boolean,
) {
  const a = sortableInstant(left);
  const b = sortableInstant(right);
  if (a === null && b !== null) return 1;
  if (b === null && a !== null) return -1;
  if (a === null || b === null) return 0;
  return ascending ? a - b : b - a;
}

/** Stable factual catalog ordering; never changes which version is published. */
export function sortExerciseCatalog<T extends ExerciseSortableSummary>(
  items: readonly T[], sort: ExerciseCatalogSort,
): T[] {
  return [...items].sort((left, right) => {
    const a = left.latestVersion;
    const b = right.latestVersion;
    let order = 0;
    if (sort === "name-asc" || sort === "name-desc") {
      order = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      if (sort === "name-desc") order = -order;
    } else if (sort === "published") {
      order = compareExerciseDates(
        left.latestPublishedVersion?.published_at ?? null,
        right.latestPublishedVersion?.published_at ?? null, false,
      );
    } else if (sort === "versions") {
      order = right.versionCount - left.versionCount;
    } else {
      order = compareExerciseDates(a.created_at, b.created_at, sort === "oldest");
    }
    return order || a.exercise_id.localeCompare(b.exercise_id) ||
      a.id.localeCompare(b.id);
  });
}
