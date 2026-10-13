/**
 * Interface-only exploration of educational versions already authorized by
 * the caller's client-scoped Supabase read. Not a release eligibility policy,
 * professional taxonomy or a source of authorization.
 */
export const RELEASE_EXPLORER_PAGE_SIZE = 12;

export type ReleasedContentEntry = {
  id: string;
  title: string;
  category: string;
  type: string;
  releasedAt: string;
  assetCount: number;
};

export type ReleasedContentAvailability = "all" | "available" | "missing";
export type ReleasedContentOrder = "newest" | "oldest" | "title" | "files";

export type ReleasedContentFilters = {
  query: string;
  category: string;
  type: string;
  availability: ReleasedContentAvailability;
  order: ReleasedContentOrder;
  year?: string;
};

export const INITIAL_RELEASE_FILTERS: Readonly<ReleasedContentFilters> = {
  query: "",
  category: "all",
  type: "all",
  availability: "all",
  order: "newest",
  year: "all",
};

export function normalizedReleasedContentSearch(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
}

function releaseInstant(value: string): number | null {
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

function compareReleaseInstants(a: string, b: string, oldest: boolean): number {
  const left = releaseInstant(a);
  const right = releaseInstant(b);
  // Legacy invalid timestamps should never become the "latest" or "oldest".
  if (left === null || right === null) {
    return left === null ? (right === null ? 0 : 1) : -1;
  }
  return oldest ? left - right : right - left;
}

export function orderReleasedContent<T extends ReleasedContentEntry>(
  input: readonly T[],
  order: ReleasedContentOrder,
): T[] {
  return [...input].sort((left, right) => {
    let primary = 0;
    if (order === "oldest") {
      primary = compareReleaseInstants(left.releasedAt, right.releasedAt, true);
    } else if (order === "title") {
      primary = left.title.localeCompare(right.title, "pt-BR", { sensitivity: "base" });
    } else if (order === "files") {
      primary = right.assetCount - left.assetCount;
    }
    if (primary !== 0) return primary;
    if (order !== "oldest") {
      const latest = compareReleaseInstants(left.releasedAt, right.releasedAt, false);
      if (latest !== 0) return latest;
    }
    return left.id.localeCompare(right.id);
  });
}

export function releasedContentFacetOptions<T extends ReleasedContentEntry>(
  records: readonly T[],
) {
  const categories = [...new Set(records.map((item) => item.category))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
  const types = [...new Set(records.map((item) => item.type))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
  return { categories, types };
}

export function releasedContentTotals<T extends ReleasedContentEntry>(
  records: readonly T[],
) {
  let available = 0;
  for (const record of records) {
    if (record.assetCount > 0) available++;
  }
  return { all: records.length, available, missing: records.length - available };
}

export function filterReleasedContent<T extends ReleasedContentEntry>(
  records: readonly T[],
  filters: ReleasedContentFilters,
): T[] {
  const query = normalizedReleasedContentSearch(filters.query);
  return orderReleasedContent(records.filter((record) => {
    if (filters.year && filters.year !== "all" && (!Number.isFinite(Date.parse(record.releasedAt)) || new Date(record.releasedAt).getUTCFullYear().toString() !== filters.year)) return false;
    if (filters.category !== "all" && record.category !== filters.category) return false;
    if (filters.type !== "all" && record.type !== filters.type) return false;
    if (filters.availability === "available" && record.assetCount <= 0) return false;
    if (filters.availability === "missing" && record.assetCount > 0) return false;
    if (!query) return true;
    return normalizedReleasedContentSearch(
      [record.title, record.category, record.type].join(" "),
    ).includes(query);
  }), filters.order);
}

export function paginateReleasedContent<T>(
  sorted: readonly T[],
  requestedPage: number,
  pageSize = RELEASE_EXPLORER_PAGE_SIZE,
) {
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, pages)
    : 1;
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    page, pages,
    total: sorted.length,
    first: sorted.length === 0 ? 0 : start + 1,
    last: Math.min(sorted.length, start + pageSize),
    previous: page > 1 ? page - 1 : null,
    next: page < pages ? page + 1 : null,
  };
}

export function releasePageForExactId(
  rows: readonly ReleasedContentEntry[],
  id: string,
  order: ReleasedContentOrder = "newest",
) {
  const index = orderReleasedContent(rows, order).findIndex((item) => item.id === id);
  return index < 0 ? null : Math.floor(index / RELEASE_EXPLORER_PAGE_SIZE) + 1;
}

export function hasActiveReleasedContentFilters(filters: ReleasedContentFilters) {
  return filters.query.trim() !== "" ||
    filters.category !== "all" ||
    filters.type !== "all" ||
    filters.availability !== "all" ||
    filters.order !== "newest" || (filters.year !== undefined && filters.year !== "all");
}

export function releasedContentYears(records: readonly ReleasedContentEntry[]): string[] {
 return [...new Set(records.map(x=>Number.isFinite(Date.parse(x.releasedAt))?String(new Date(x.releasedAt).getUTCFullYear()):"").filter(Boolean))].sort().reverse();
}
