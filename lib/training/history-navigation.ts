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
