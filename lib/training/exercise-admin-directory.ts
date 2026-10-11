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

/** Administrative discovery only; this is never a client release. */
export type ExerciseCatalogSort = "recent" | "oldest" | "name-asc" | "name-desc" | "published" | "versions";
export const EXERCISE_CATALOG_PAGE_SIZE = 12;

export function readExerciseCatalogSort(raw: unknown): ExerciseCatalogSort {
  return raw === "oldest" || raw === "name-asc" || raw === "name-desc" ||
    raw === "published" || raw === "versions" ? raw : "recent";
}
export function readExerciseCatalogPage(raw: unknown): { page: number; invalid: boolean } {
  if (raw === undefined || raw === "1") return { page: 1, invalid: false };
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,4}$/.test(raw)) return { page: 1, invalid: true };
  const page = Number(raw);
  return page <= 10000 ? { page, invalid: false } : { page: 1, invalid: true };
}

export type CatalogSortableVersion = {
  exercise_id: string;
  id: string;
  created_at: string;
  name: string;
  version_number: number;
  published_at: string | null;
};
export type CatalogSortableSummary = {
  latestVersion: CatalogSortableVersion;
  latestPublishedVersion: CatalogSortableVersion | null;
};
function sortableTime(value: string | null): number | null {
  if (!value) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}
function compareTime(left: string | null, right: string | null, ascending: boolean): number {
  const a = sortableTime(left), b = sortableTime(right);
  if (a === null && b !== null) return 1;
  if (b === null && a !== null) return -1;
  if (a === null || b === null) return 0;
  return ascending ? a-b : b-a;
}
/** Stable sorting without mutating authorized rows or guessing clinical categories. */
export function sortExerciseCatalog<T extends CatalogSortableSummary>(
  rows: readonly T[], order: ExerciseCatalogSort,
): T[] {
  return [...rows].sort((left,right) => {
    const a=left.latestVersion, b=right.latestVersion;
    let comparison=0;
    if (order === "name-asc" || order === "name-desc") {
      comparison = a.name.localeCompare(b.name,"pt-BR",{sensitivity:"base"});
      if (order === "name-desc") comparison = -comparison;
    } else if (order === "published") {
      comparison = compareTime(left.latestPublishedVersion?.published_at ?? null,
        right.latestPublishedVersion?.published_at ?? null, false);
    } else if (order === "versions") {
      comparison = b.version_number - a.version_number;
    } else {
      comparison = compareTime(a.created_at,b.created_at,order === "oldest");
    }
    return comparison || a.exercise_id.localeCompare(b.exercise_id) || a.id.localeCompare(b.id);
  });
}
export type ExerciseCatalogPage<T> = {
  items: T[];
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
  previous: number | null;
  next: number | null;
  invalid: boolean;
};
/** Pagination applies after filtering and sorting, including versionless parents. */
export function paginateExerciseCatalog<T>(
  rows: readonly T[], rawPage: unknown, pageSize = EXERCISE_CATALOG_PAGE_SIZE,
): ExerciseCatalogPage<T> {
  const requested = readExerciseCatalogPage(rawPage);
  const total = rows.length;
  const pages = Math.max(1,Math.ceil(total/pageSize));
  const page = Math.min(requested.page,pages);
  const start=(page-1)*pageSize;
  return {
    items: rows.slice(start,start+pageSize),page,pages,total,
    from:total?start+1:0,to:Math.min(total,start+pageSize),
    previous:page>1?page-1:null,next:page<pages?page+1:null,
    invalid:requested.invalid || requested.page>pages,
  };
}
export function exerciseCatalogHref(input:{
  term?:string;
  status?:ExerciseCatalogStatus;
  sort?:ExerciseCatalogSort;
  page?:number;
  anchor?:string;
}): string {
  const search=new URLSearchParams();
  const term=readExerciseCatalogTerm(input.term);
  if(term)search.set("q",term);
  if(input.status && input.status!=="all") search.set("status",input.status);
  if(input.sort && input.sort!=="recent") search.set("ordem",input.sort);
  if(input.page && input.page>1) search.set("pagina",String(input.page));
  return "/admin/exercicios"+(search.size?"?"+search.toString():"")+
    (input.anchor ? "#"+encodeURIComponent(input.anchor) : "");
}
export function catalogVisiblePageNumbers(page:number,pages:number):number[]{
  if(pages<1)return [];
  const values=new Set([1,pages,page-1,page,page+1].filter(n=>n>=1&&n<=pages));
  return [...values].sort((a,b)=>a-b);
}
