import { matchesClientDirectoryName, normalizeClientDirectorySearch } from "../clients/client-directory-search.ts";
import { orderAdministrativeAssessments } from "./administrative-assessment-history.ts";

export type AdminAssessmentDirectoryEntry = {
  id: string;
  clientId: string;
  clientName: string | null;
  legacyClientName: string | null;
  assessedAt: string;
  finalizedAt: string | null;
  kind: string | null;
};

export type AdminAssessmentDirectoryFilters = {
  query: string;
  status: "all" | "draft" | "finalized";
  kind: string;
  month: string;
  order: "newest" | "oldest" | "client";
};

export const ADMIN_ASSESSMENT_PAGE_SIZE = 15;

/** Filter only the assessments already authorized by the server's RLS query. */
export function exploreAdminAssessmentDirectory<T extends AdminAssessmentDirectoryEntry>(
  entries: readonly T[],
  filters: AdminAssessmentDirectoryFilters,
  knownKinds: readonly string[],
): T[] {
  const search = filters.query.trim().slice(0, 120);
  const rows = entries.filter((entry) => {
    if (!matchesClientDirectoryName(search, entry.clientName, entry.legacyClientName)) return false;
    if (filters.status === "draft" && entry.finalizedAt !== null) return false;
    if (filters.status === "finalized" && entry.finalizedAt === null) return false;
    if (filters.kind === "legacy") {
      if (entry.kind !== null && knownKinds.includes(entry.kind)) return false;
    } else if (filters.kind !== "all" && entry.kind !== filters.kind) {
      return false;
    }
    const actualMonth = assessmentMonthInSaoPaulo(entry.assessedAt);
    if (filters.month === "invalid" && actualMonth !== null) return false;
    if (filters.month !== "all" && filters.month !== "invalid" && actualMonth !== filters.month) {
      return false;
    }
    return true;
  });
  const newest = orderAdministrativeAssessments(
    rows.map((entry) => ({ id: entry.id, assessed_at: entry.assessedAt, entry })),
  ).map((item) => item.entry);

  if (filters.order === "newest") return newest;
  if (filters.order === "oldest") {
    return [...newest].sort((a, b) => {
      const at = Date.parse(a.assessedAt);
      const bt = Date.parse(b.assessedAt);
      if (!Number.isFinite(at)) return Number.isFinite(bt) ? 1 : a.id.localeCompare(b.id);
      if (!Number.isFinite(bt)) return -1;
      return at - bt || a.id.localeCompare(b.id);
    });
  }
  const recency = new Map(newest.map((entry, index) => [entry.id, index]));
  return [...newest].sort((a, b) => {
    const aName = normalizeClientDirectorySearch(a.clientName?.trim() || a.legacyClientName?.trim() || "");
    const bName = normalizeClientDirectorySearch(b.clientName?.trim() || b.legacyClientName?.trim() || "");
    if (!aName && bName) return 1;
    if (aName && !bName) return -1;
    return aName.localeCompare(bName, "pt-BR") || (recency.get(a.id) ?? 0) - (recency.get(b.id) ?? 0);
  });
}

/** Month grouping uses the actual instant in the professional's local timezone. */
export function assessmentMonthInSaoPaulo(value: string): string | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? year + "-" + month : null;
}

export function availableAdminAssessmentMonths(entries: readonly Pick<AdminAssessmentDirectoryEntry, "assessedAt">[]) {
  const months = new Set<string>();
  let hasInvalidDate = false;
  for (const entry of entries) {
    const month = assessmentMonthInSaoPaulo(entry.assessedAt);
    if (month) months.add(month);
    else hasInvalidDate = true;
  }
  return { months: [...months].sort().reverse(), hasInvalidDate };
}

export function labelAdminAssessmentMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1, 1, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
}

export function paginateAdminAssessments<T>(rows: readonly T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_ASSESSMENT_PAGE_SIZE));
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, pageCount))
    : 1;
  const start = (page - 1) * ADMIN_ASSESSMENT_PAGE_SIZE;
  return {
    items: rows.slice(start, start + ADMIN_ASSESSMENT_PAGE_SIZE),
    page, pageCount,
    total: rows.length,
    first: rows.length ? start + 1 : 0,
    last: Math.min(rows.length, start + ADMIN_ASSESSMENT_PAGE_SIZE),
  };
}

export function visibleAdminAssessmentPages(current: number, pageCount: number) {
  const pages = new Set<number>();
  if (pageCount < 1) return [];
  pages.add(1);
  pages.add(pageCount);
  for (let p = Math.max(1, current - 1); p <= Math.min(pageCount, current + 1); p++) {
    pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}
