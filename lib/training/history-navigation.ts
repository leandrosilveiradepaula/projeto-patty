import { newestTrainingRequests } from "./operational-order.ts";
import { publishedTrainingVersions } from "./published-versions.ts";
import { paginateTrainingRequests, parseTrainingHistoryPage } from "./version-inspection.ts";

/**
 * Historical exploration only. These selectors receive caller-authorized
 * Supabase rows; they do not implement access control or clinical decisions.
 */
export type TrainingRequestFilters = {
  origin: "all" | "client" | "professional" | "unknown";
  notes: "all" | "with-note" | "without-note";
  period: "all" | "after-publication" | "before-or-at-publication";
  order: "newest" | "oldest";
  page: string | undefined;
};

export type TrainingRequestRow = {
  id: string;
  requested_at: string;
  recorded_by_profile_id: string | null;
  note: string | null;
};

export function parseTrainingRequestFilters(
  query: Record<string, unknown>,
): TrainingRequestFilters {
  const choice = <T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T =>
    typeof raw === "string" && allowed.includes(raw as T) ? raw as T : fallback;
  return {
    origin: choice(query.origem, ["all", "client", "professional", "unknown"], "all"),
    notes: choice(query.observacao, ["all", "with-note", "without-note"], "all"),
    period: choice(query.periodo, ["all", "after-publication", "before-or-at-publication"], "all"),
    order: choice(query.ordem, ["newest", "oldest"], "newest"),
    page: typeof query.pedidos === "string" ? query.pedidos : undefined,
  };
}

export function trainingRequestFactualOrigin(
  recordedBy: string | null | undefined,
  currentClientProfileId: string | null | undefined,
): "client" | "professional" | "unknown" {
  if (!recordedBy || !currentClientProfileId) return "unknown";
  return recordedBy === currentClientProfileId ? "client" : "professional";
}

function validInstant(date: string): number | null {
  const instant = Date.parse(date);
  return Number.isFinite(instant) ? instant : null;
}

export function exploreTrainingRequests<T extends TrainingRequestRow>(
  records: readonly T[],
  filters: TrainingRequestFilters,
  clientProfileId: string | null | undefined,
  latestPublishedAt: string | null | undefined,
  excludeNewest = false,
) {
  const latest = newestTrainingRequests(records);
  const publication = latestPublishedAt ? validInstant(latestPublishedAt) : null;
  const scoped = excludeNewest ? latest.slice(1) : latest;
  const filtered = scoped.filter((item) => {
    if (filters.origin !== "all" &&
      trainingRequestFactualOrigin(item.recorded_by_profile_id, clientProfileId) !== filters.origin) return false;
    if (filters.notes !== "all" &&
      Boolean(item.note?.trim()) !== (filters.notes === "with-note")) return false;
    if (filters.period !== "all") {
      if (publication === null) return false;
      const requested = validInstant(item.requested_at);
      if (requested === null) return false;
      if (filters.period === "after-publication" && requested <= publication) return false;
      if (filters.period === "before-or-at-publication" && requested > publication) return false;
    }
    return true;
  });
  if (filters.order === "oldest") {
    filtered.sort((a, b) => {
      const left = validInstant(a.requested_at);
      const right = validInstant(b.requested_at);
      if (left === null || right === null) {
        return left === null ? (right === null ? a.id.localeCompare(b.id) : 1) : -1;
      }
      return left - right || a.id.localeCompare(b.id);
    });
  }
  const page = paginateTrainingRequests(filtered, filters.page);
  return {
    ...page,
    unfiltered: scoped.length,
    unknownOrigins: scoped.filter(item =>
      trainingRequestFactualOrigin(item.recorded_by_profile_id, clientProfileId) === "unknown").length,
  };
}

/** Only validated enumerated URL options; never serializes request notes. */
export function trainingRequestFilteredHref(
  base: string,
  filters: TrainingRequestFilters,
  page: number,
  anchor: "historico-solicitacoes-treino" | "solicitacoes-anteriores",
  versionPage?: number,
) {
  const p = new URLSearchParams();
  if (filters.origin !== "all") p.set("origem", filters.origin);
  if (filters.notes !== "all") p.set("observacao", filters.notes);
  if (filters.period !== "all") p.set("periodo", filters.period);
  if (filters.order !== "newest") p.set("ordem", filters.order);
  if (page > 1) p.set("pedidos", String(page));
  if (versionPage && versionPage > 1) p.set("versoes", String(versionPage));
  return base + (p.size ? "?" + p.toString() : "") + "#" + anchor;
}

/** Link to an exact authorized request, clearing filters that might hide it. */
export function trainingRequestExactHref(
  base: string,
  records: readonly TrainingRequestRow[],
  requestId: string,
  versionPage?: number,
) {
  const index = newestTrainingRequests(records).findIndex(r => r.id === requestId);
  if (index === -1) return null;
  const page = Math.floor(index / 10) + 1;
  const params = new URLSearchParams();
  if (page > 1) params.set("pedidos", String(page));
  if (versionPage && versionPage > 1) params.set("versoes", String(versionPage));
  return base + (params.size ? "?" + params.toString() : "") + "#pedido-treino-" + requestId;
}

export const TRAINING_VERSIONS_PER_PAGE = 6;

export function paginateTrainingVersions<T>(versions: readonly T[], rawPage: unknown) {
  const page = paginateTrainingRequests(versions, rawPage, TRAINING_VERSIONS_PER_PAGE);
  return { ...page, itemCount: versions.length };
}

/** Exact old-version links are resolved only against previously authorized versions. */
export function trainingVersionExactHref<T extends { id: string }>(
  base: string,
  orderedVersions: readonly T[],
  versionId: string,
  requestFilters?: TrainingRequestFilters,
) {
  const index = orderedVersions.findIndex(v => v.id === versionId);
  if (index === -1) return null;
  const params = new URLSearchParams();
  const targetPage = Math.floor(index / TRAINING_VERSIONS_PER_PAGE) + 1;
  if (targetPage > 1) params.set("versoes", String(targetPage));
  if (requestFilters) {
    if (requestFilters.origin !== "all") params.set("origem", requestFilters.origin);
    if (requestFilters.notes !== "all") params.set("observacao", requestFilters.notes);
    if (requestFilters.period !== "all") params.set("periodo", requestFilters.period);
    if (requestFilters.order !== "newest") params.set("ordem", requestFilters.order);
    if (requestFilters.page && !parseTrainingHistoryPage(requestFilters.page).invalid && requestFilters.page !== "1") params.set("pedidos", requestFilters.page);
  }
  return base + (params.size ? "?" + params.toString() : "") + "#treino-versao-" + versionId;
}

export function trainingVersionPageHref(
  base: string,
  page: number,
  requestFilters?: TrainingRequestFilters,
  anchor = "historico-versoes-treino",
) {
  const params = new URLSearchParams();
  if (page > 1) params.set("versoes", String(page));
  if (requestFilters) {
    if (requestFilters.origin !== "all") params.set("origem", requestFilters.origin);
    if (requestFilters.notes !== "all") params.set("observacao", requestFilters.notes);
    if (requestFilters.period !== "all") params.set("periodo", requestFilters.period);
    if (requestFilters.order !== "newest") params.set("ordem", requestFilters.order);
    if (requestFilters.page && requestFilters.page !== "1") params.set("pedidos", requestFilters.page);
  }
  return base + (params.size ? "?" + params.toString() : "") + "#" + anchor;
}

export function selectPublishedTrainingComparison<
  T extends {id:string; published_at:string|null},
>(versions: readonly T[], requestedId: unknown) {
  const ordered = publishedTrainingVersions(versions);
  const selectedIndex = typeof requestedId === "string"
    ? ordered.findIndex(v => v.id === requestedId)
    : 0;
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  return {
    selected: ordered[safeIndex] ?? null,
    previous: ordered[safeIndex + 1] ?? null,
    invalid: typeof requestedId === "string" && requestedId.length > 0 && selectedIndex < 0,
  };
}

/** Authorized direct links to the exact immutable published version. */
export function trainingVersionComparisonHref<T extends { id: string; published_at: string | null }>(
  base: string, authorized: readonly T[], versionId: string, requestFilters?: TrainingRequestFilters,
) {
  if (!authorized.some(version => version.id === versionId && Boolean(version.published_at))) return null;
  const url = trainingVersionExactHref(base, authorized.filter(v => Boolean(v.published_at)), versionId, requestFilters);
  if (!url) return null;
  const [path] = url.split("#");
  return path + (path.includes("?") ? "&" : "?") +
    "comparar=" + encodeURIComponent(versionId) + "#comparar-publicacoes-treino";
}

/** Latest request is shown outside paginated history in the client workspace. */
export function clientTrainingRequestExactHref(
  base: string, authorized: readonly TrainingRequestRow[], requestId: string, versionPage?: number,
) {
  const sorted = newestTrainingRequests(authorized);
  const index = sorted.findIndex(row => row.id === requestId);
  if (index < 0) return null;
  if (index === 0) return base + "#pedido-treino-" + requestId;
  return trainingRequestExactHref(base, sorted.slice(1), requestId, versionPage);
}

/** Links preserve the other section's page, never notes or unpublished content. */
export function trainingHistoryPreservedFilterParams(filters: TrainingRequestFilters, versionPage?: number) {
  const p = new URLSearchParams();
  if (filters.origin !== "all") p.set("origem", filters.origin);
  if (filters.notes !== "all") p.set("observacao", filters.notes);
  if (filters.period !== "all") p.set("periodo", filters.period);
  if (filters.order !== "newest") p.set("ordem", filters.order);
  if (versionPage && versionPage > 1 && Number.isSafeInteger(versionPage)) p.set("versoes", String(versionPage));
  return p;
}


/**
 * Administrative version explorer. These are projections of versions already
 * returned to the authenticated professional by RLS-protected data access.
 */
export type TrainingVersionFilters = {
  query: string;
  status: "all" | "published" | "reviewed" | "draft";
  order: "number-desc" | "number-asc" | "title";
  page: string | undefined;
};
export type TrainingVersionArchiveRow = {
  id: string;
  title: string;
  version_number: number;
  published_at: string | null;
  reviewed_at: string | null;
};
export function parseTrainingVersionFilters(raw: Record<string, unknown>): TrainingVersionFilters {
  return {
    query: typeof raw.buscaVersao === "string" ? raw.buscaVersao.trim().slice(0, 120) : "",
    status: raw.estadoVersao === "published" || raw.estadoVersao === "reviewed" || raw.estadoVersao === "draft" ? raw.estadoVersao : "all",
    order: raw.ordemVersao === "number-asc" || raw.ordemVersao === "title" ? raw.ordemVersao : "number-desc",
    page: typeof raw.versoes === "string" ? raw.versoes : undefined,
  };
}
function normalizeHistoryText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
export function exploreTrainingVersionHistory<T extends TrainingVersionArchiveRow>(
  rows: readonly T[],
  filters: TrainingVersionFilters,
) {
  const query = normalizeHistoryText(filters.query);
  const matched = rows.filter(row => {
    if (filters.status === "published" && !row.published_at) return false;
    if (filters.status === "reviewed" && (!row.reviewed_at || row.published_at)) return false;
    if (filters.status === "draft" && (row.reviewed_at || row.published_at)) return false;
    return !query || normalizeHistoryText(row.title).includes(query) || String(row.version_number).includes(query);
  });
  const ordered = [...matched].sort((a,b) => {
    if (filters.order === "title") {
      return a.title.localeCompare(b.title,"pt-BR",{sensitivity:"base"}) ||
        b.version_number-a.version_number || a.id.localeCompare(b.id);
    }
    const numeric = filters.order === "number-asc" ? a.version_number-b.version_number : b.version_number-a.version_number;
    return numeric || a.id.localeCompare(b.id);
  });
  const page = paginateTrainingVersions(ordered,filters.page);
  return {...page, filteredCount:matched.length, unfilteredCount:rows.length};
}
export function trainingAdminVersionHref(
  base: string,
  rows: readonly TrainingVersionArchiveRow[],
  versionId: string,
  requests?: TrainingRequestFilters,
) {
  const index = rows.findIndex(row=>row.id===versionId);
  if (index < 0) return null;
  const p = trainingHistoryPreservedFilterParams(requests ?? parseTrainingRequestFilters({}));
  const page = Math.floor(index / TRAINING_VERSIONS_PER_PAGE) + 1;
  if (page > 1) p.set("versoes",String(page));
  return base + (p.size ? "?" + p.toString() : "") + "#versao-treino-" + versionId;
}
export function trainingAdminVersionPageHref(
  base: string,
  page: number,
  versions: TrainingVersionFilters,
  requests: TrainingRequestFilters,
) {
  const p = trainingHistoryPreservedFilterParams(requests);
  if (versions.query) p.set("buscaVersao",versions.query);
  if (versions.status !== "all") p.set("estadoVersao",versions.status);
  if (versions.order !== "number-desc") p.set("ordemVersao",versions.order);
  if (page > 1) p.set("versoes",String(page));
  return base + (p.size?"?"+p.toString():"") + "#historico-versoes-treino";
}

/** Client-side archive navigation without exposing unpublished versions. */
export type ClientTrainingArchiveFilters = {
  query: string;
  order: "newest" | "oldest" | "title";
  page: string | undefined;
};
export function parseClientTrainingArchiveFilters(raw: Record<string, unknown>): ClientTrainingArchiveFilters {
  return {
    query: typeof raw.buscaTreino === "string" ? raw.buscaTreino.trim().slice(0, 120) : "",
    order: raw.ordemTreino === "oldest" || raw.ordemTreino === "title" ? raw.ordemTreino : "newest",
    page: typeof raw.versoes === "string" ? raw.versoes : undefined,
  };
}
export type ClientTrainingArchivedVersion = {
  version: {id:string;title:string;version_number:number;published_at:string|null};
};
export function exploreClientTrainingArchive<T extends ClientTrainingArchivedVersion>(
  previous: readonly T[],
  filters: ClientTrainingArchiveFilters,
) {
  const query = normalizeHistoryText(filters.query);
  const matches = previous.filter(({version}) =>
    Boolean(version.published_at) &&
    (!query || normalizeHistoryText(version.title).includes(query) || String(version.version_number).includes(query)),
  );
  const ordered = [...matches];
  if (filters.order === "oldest") ordered.reverse();
  if (filters.order === "title") {
    ordered.sort((a,b)=>a.version.title.localeCompare(b.version.title,"pt-BR",{sensitivity:"base"}) ||
      b.version.version_number-a.version.version_number || a.version.id.localeCompare(b.version.id));
  }
  const result = paginateTrainingVersions(ordered,filters.page);
  return {...result,filteredCount:matches.length,unfilteredCount:previous.length};
}
export function trainingClientArchiveHref(
  base: string,
  filters: ClientTrainingArchiveFilters,
  page: number,
  requests?: TrainingRequestFilters,
  comparisonId?: string | null,
) {
  const p = trainingHistoryPreservedFilterParams(requests ?? parseTrainingRequestFilters({}));
  if (filters.query) p.set("buscaTreino",filters.query);
  if (filters.order !== "newest") p.set("ordemTreino",filters.order);
  if (page > 1) p.set("versoes",String(page));
  if (comparisonId) p.set("comparar",comparisonId);
  return base + (p.size?"?"+p.toString():"") + "#historico-versoes-treino";
}
export function trainingClientArchivedVersionHref(
  base: string,
  previous: readonly ClientTrainingArchivedVersion[],
  versionId: string,
  requests?: TrainingRequestFilters,
) {
  const index = previous.findIndex(row=>row.version.id===versionId && Boolean(row.version.published_at));
  if (index<0) return null;
  const p = trainingHistoryPreservedFilterParams(requests ?? parseTrainingRequestFilters({}));
  const page = Math.floor(index / TRAINING_VERSIONS_PER_PAGE)+1;
  if (page > 1) p.set("versoes",String(page));
  return base + (p.size?"?"+p.toString():"") + "#treino-versao-" + versionId;
}
