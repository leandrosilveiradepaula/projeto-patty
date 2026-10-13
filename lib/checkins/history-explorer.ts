/** Only presentation of already authorized, factual check-in history. */
export type CheckinExploreSort = "newest" | "oldest" | "amount-desc" | "amount-asc" | "recent-correction";
export type CheckinExploreCorrection = "all" | "corrected" | "original";
export type CheckinExploreActivity = "all" | "yes" | "no";
export type CheckinExploreOrigin = "all" | "client" | "professional";
export type CheckinExploreActivitySort = "newest" | "oldest" | "recent-correction";
export type CheckinExploreRepeated = "all" | "multiple" | "single";
export type CheckinExploreOptions = {
  liquidSort: CheckinExploreSort;
  liquidCorrection: CheckinExploreCorrection;
  liquidKind: string;
  liquidOrigin: CheckinExploreOrigin;
  activityFilter: CheckinExploreActivity;
  activityCorrection: CheckinExploreCorrection;
  activityOrigin: CheckinExploreOrigin;
  activitySort: CheckinExploreActivitySort;
  liquidPage: number;
  activityPage: number;
  liquidYear: string;
  liquidMonth: string;
  activityYear: string;
  activityMonth: string;
  minimumMl: number | null;
  maximumMl: number | null;
  activityRepeated: CheckinExploreRepeated;
};

export const CHECKIN_EXPLORER_PAGE_SIZE = 12;
function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

export function readCheckinExploreOptions(query: Record<string, unknown>): CheckinExploreOptions {
  const page = (value: unknown) => {
    if (typeof value !== "string" || !/^[1-9][0-9]{0,4}$/.test(value)) return 1;
    return Math.min(Number(value), 10000);
  };
  const amount = (value: unknown): number | null => typeof value === "string" && /^[1-9][0-9]{0,9}$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null;
  const year = (value: unknown) => typeof value === "string" && /^(19|20)[0-9]{2}$/.test(value) ? value : "all";
  const month = (value: unknown) => typeof value === "string" && /^(0[1-9]|1[0-2])$/.test(value) ? value : "all";
  const min = amount(query.minMl);
  const max = amount(query.maxMl);
  return {
    liquidSort: pick(query.ordem, ["newest", "oldest", "amount-desc", "amount-asc", "recent-correction"], "newest"),
    liquidCorrection: pick(query.correcao, ["all", "corrected", "original"], "all"),
    liquidKind: typeof query.tipo === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(query.tipo) ? query.tipo : "all",
    liquidOrigin: pick(query.origemLiquido, ["all", "client", "professional"], "all"),
    activityFilter: pick(query.atividade, ["all", "yes", "no"], "all"),
    activityCorrection: pick(query.atividadeCorrecao, ["all", "corrected", "original"], "all"),
    activityOrigin: pick(query.origemAtividade, ["all", "client", "professional"], "all"),
    activitySort: pick(query.ordemAtividade, ["newest", "oldest", "recent-correction"], "newest"),
    liquidPage: page(query.lp),
    activityPage: page(query.ap),
    liquidYear: year(query.anoLiquido),
    liquidMonth: month(query.mesLiquido),
    activityYear: year(query.anoAtividade),
    activityMonth: month(query.mesAtividade),
    minimumMl: min !== null && max !== null && min > max ? null : min,
    maximumMl: min !== null && max !== null && min > max ? null : max,
    activityRepeated: pick(query.repeticaoAtividade, ["all", "multiple", "single"], "all"),
  };
}

/** Invalid timestamps never outrank valid historical events; compare instants, not offset strings. */
export function compareCheckinEventInstants(
  a: { recorded_at: string; id: string },
  b: { recorded_at: string; id: string },
): number {
  const at = Date.parse(a.recorded_at);
  const bt = Date.parse(b.recorded_at);
  const left = Number.isFinite(at) ? at : -Infinity;
  const right = Number.isFinite(bt) ? bt : -Infinity;
  return right - left || b.id.localeCompare(a.id);
}

/** Sao Paulo civil date for factual liquid histories (not a hydration target). */
export function liquidHistoryCalendarDate(value: string): string | null {
  if (!Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}
export function availableCheckinHistoryYears(dates: readonly (string | null)[]): string[] {
  return Array.from(new Set(dates.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).map(d=>d.slice(0,4)))).sort().reverse();
}
function dateMatchesFilter(date: string | null, year: string, month: string): boolean {
  return (year === "all" && month === "all") || (date !== null &&
    (year === "all" || date.slice(0,4) === year) &&
    (month === "all" || date.slice(5,7) === month));
}
function checkinCorrectionSort(a: { lastCorrectedAt?: string | null }, b: { lastCorrectedAt?: string | null }): number {
  const instant = (value?: string | null) => {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : -Infinity;
  };
  return instant(b.lastCorrectedAt) - instant(a.lastCorrectedAt) || 0;
}
function matchesOrigin(
  recordedBy: string | undefined,
  clientProfileId: string | null | undefined,
  filter: CheckinExploreOrigin,
) {
  if (filter === "all") return true;
  if (!clientProfileId || !recordedBy) return false;
  return (recordedBy === clientProfileId) === (filter === "client");
}

export function exploreLiquidCheckins<T extends {
  id: string;
  recorded_at: string;
  recorded_by_profile_id?: string;
  effectiveAmountMl: number;
  effectiveLiquidKind: string;
  wasCorrected: boolean;
  lastCorrectedAt?: string | null;
}>(events: readonly T[], options: CheckinExploreOptions, clientProfileId?: string | null) {
  const filtered = events.filter(e =>
    dateMatchesFilter(liquidHistoryCalendarDate(e.recorded_at), options.liquidYear, options.liquidMonth) &&
    (options.minimumMl === null || e.effectiveAmountMl >= options.minimumMl) &&
    (options.maximumMl === null || e.effectiveAmountMl <= options.maximumMl) &&
    (options.liquidKind === "all" || e.effectiveLiquidKind === options.liquidKind) &&
    (options.liquidCorrection === "all" || e.wasCorrected === (options.liquidCorrection === "corrected")) &&
    matchesOrigin(e.recorded_by_profile_id, clientProfileId, options.liquidOrigin)
  ).slice().sort((a, b) => {
    if (options.liquidSort === "recent-correction") {
      return checkinCorrectionSort(a,b) || compareCheckinEventInstants(a,b);
    }
    if (options.liquidSort === "amount-desc" || options.liquidSort === "amount-asc") {
      const amountDifference = a.effectiveAmountMl - b.effectiveAmountMl;
      return (options.liquidSort === "amount-desc" ? -amountDifference : amountDifference) ||
        compareCheckinEventInstants(a, b);
    }
    const compare = compareCheckinEventInstants(a, b);
    return options.liquidSort === "oldest" ? -compare : compare;
  });
  return paginateCheckinEvents(filtered, options.liquidPage);
}

export function exploreActivityCheckins<T extends {
  id: string;
  checkin_date?: string;
  recorded_at: string;
  recorded_by_profile_id?: string;
  didActivityEffective: boolean;
  wasCorrected: boolean;
  lastCorrectedAt?: string | null;
}>(events: readonly T[], options: CheckinExploreOptions, clientProfileId?: string | null) {
  const dayCounts = new Map<string, number>();
  for(const e of events) dayCounts.set(e.checkin_date ?? "", (dayCounts.get(e.checkin_date ?? "") ?? 0) + 1);
  const filtered = events.filter(e =>
    dateMatchesFilter(e.checkin_date ?? null, options.activityYear, options.activityMonth) &&
    (options.activityRepeated === "all" || ((dayCounts.get(e.checkin_date ?? "") ?? 0) > 1) === (options.activityRepeated === "multiple")) &&
    (options.activityFilter === "all" || e.didActivityEffective === (options.activityFilter === "yes")) &&
    (options.activityCorrection === "all" || e.wasCorrected === (options.activityCorrection === "corrected")) &&
    matchesOrigin(e.recorded_by_profile_id, clientProfileId, options.activityOrigin)
  ).slice().sort((a, b) => {
    const byDate = (b.checkin_date ?? "").localeCompare(a.checkin_date ?? "");
    const newer = byDate || compareCheckinEventInstants(a, b);
    if (options.activitySort === "recent-correction") return checkinCorrectionSort(a,b) || newer;
    return options.activitySort === "oldest" ? -newer : newer;
  });
  return paginateCheckinEvents(filtered, options.activityPage);
}

export function paginateCheckinEvents<T>(events: readonly T[], requestedPage: number) {
  const total = events.length;
  const pages = Math.max(1, Math.ceil(total / CHECKIN_EXPLORER_PAGE_SIZE));
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, pages))
    : 1;
  return {
    items: events.slice((page - 1) * CHECKIN_EXPLORER_PAGE_SIZE, page * CHECKIN_EXPLORER_PAGE_SIZE),
    orderedIds: events.map(item => (item as { id: string }).id),
    total,
    page,
    pages,
    outOfRange: Number.isSafeInteger(requestedPage) && requestedPage > pages,
    first: total === 0 ? 0 : (page - 1) * CHECKIN_EXPLORER_PAGE_SIZE + 1,
    last: Math.min(total, page * CHECKIN_EXPLORER_PAGE_SIZE),
  };
}

/** Query values come from readCheckinExploreOptions; no patient details or raw answers. */
export function checkinExploreHref(base: string, query: Record<string, string | undefined>, patch: Record<string, string>) {
  const search = new URLSearchParams();
  for (const [key, val] of Object.entries({ ...query, ...patch })) {
    if (val && val !== "all" && !((key === "lp" || key === "ap") && val === "1")) search.set(key, val);
  }
  return base + (search.size ? "?" + search.toString() : "");
}

export function checkinExplorerQuery(
  options: CheckinExploreOptions,
  selectedDay: string | undefined,
  pages?: { liquid?: number; activity?: number },
): Record<string, string | undefined> {
  return {
    dia: selectedDay,
    ordem: options.liquidSort,
    anoLiquido: options.liquidYear,
    mesLiquido: options.liquidMonth,
    minMl: options.minimumMl === null ? undefined : String(options.minimumMl),
    maxMl: options.maximumMl === null ? undefined : String(options.maximumMl),
    correcao: options.liquidCorrection,
    tipo: options.liquidKind,
    origemLiquido: options.liquidOrigin,
    atividade: options.activityFilter,
    anoAtividade: options.activityYear,
    mesAtividade: options.activityMonth,
    repeticaoAtividade: options.activityRepeated,
    atividadeCorrecao: options.activityCorrection,
    origemAtividade: options.activityOrigin,
    ordemAtividade: options.activitySort,
    lp: String(pages?.liquid ?? options.liquidPage),
    ap: String(pages?.activity ?? options.activityPage),
  };
}

/** Preserve independent tab/section filters when resetting just one explorer. */
export function checkinExplorerClearQuery(
  options: CheckinExploreOptions,
  day: string | undefined,
  target: "liquid" | "activity",
  pages?: { liquid?: number; activity?: number },
) {
  const query = checkinExplorerQuery(options, day, pages);
  if (target === "liquid") {
    for (const key of ["ordem", "correcao", "tipo", "origemLiquido", "anoLiquido", "mesLiquido", "minMl", "maxMl", "lp"]) delete query[key];
  } else {
    for (const key of ["atividade", "atividadeCorrecao", "origemAtividade", "ordemAtividade", "anoAtividade", "mesAtividade", "repeticaoAtividade", "ap"]) delete query[key];
  }
  return query;
}


/** Only the presentation filters/pagination are allowed through a correction form.
 * No client IDs, days, statuses or destination URLs are accepted from the form.
 */
export function checkinCorrectionReturnQuery(options: CheckinExploreOptions): string {
  const fields = checkinExplorerQuery(options, undefined);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value && value !== "all" && !((key === "lp" || key === "ap") && value === "1")) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function readCheckinCorrectionReturnQuery(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string" || raw.length > 512) return "";
  const input = new URLSearchParams(raw);
  const safe = readCheckinExploreOptions(Object.fromEntries(input));
  return checkinCorrectionReturnQuery(safe);
}

/** Resolve a target only in a list already read under the current user's RLS scope.
 * Keep current filters if possible; relax only incompatible filters in the target section.
 * Preserve both section sort orders and all filters for the other section.
 */
export function resolveCheckinExactTarget<T extends { id: string }>(
  records: readonly T[],
  targetId: unknown,
  options: CheckinExploreOptions,
  section: "liquid" | "activity",
  select: (records: readonly T[], options: CheckinExploreOptions) => { orderedIds: string[] },
): CheckinExploreOptions {
  if (typeof targetId !== "string" || !targetId || targetId.length > 128) return options;
  const pageFor = (value: CheckinExploreOptions): number | null => {
    const index = select(records, value).orderedIds.indexOf(targetId);
    return index === -1 ? null : Math.floor(index / CHECKIN_EXPLORER_PAGE_SIZE) + 1;
  };
  const existing = pageFor(options);
  if (existing !== null) {
    return section === "liquid" ? { ...options, liquidPage: existing } : { ...options, activityPage: existing };
  }
  const relaxed: CheckinExploreOptions = section === "liquid"
    ? { ...options, liquidKind: "all", liquidOrigin: "all", liquidCorrection: "all", liquidYear: "all", liquidMonth: "all", minimumMl: null, maximumMl: null, liquidPage: 1 }
    : { ...options, activityFilter: "all", activityOrigin: "all", activityCorrection: "all", activityYear: "all", activityMonth: "all", activityRepeated: "all", activityPage: 1 };
  const fallback = pageFor(relaxed);
  if (fallback === null) return options;
  return section === "liquid" ? { ...relaxed, liquidPage: fallback } : { ...relaxed, activityPage: fallback };
}
