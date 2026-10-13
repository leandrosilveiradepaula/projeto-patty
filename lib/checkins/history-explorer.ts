/** Only presentation of already authorized, factual check-in history. */
export type CheckinExploreSort = "newest" | "oldest" | "amount-desc" | "amount-asc";
export type CheckinExploreCorrection = "all" | "corrected" | "original";
export type CheckinExploreActivity = "all" | "yes" | "no";
export type CheckinExploreOrigin = "all" | "client" | "professional";
export type CheckinExploreActivitySort = "newest" | "oldest";
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
  return {
    liquidSort: pick(query.ordem, ["newest", "oldest", "amount-desc", "amount-asc"], "newest"),
    liquidCorrection: pick(query.correcao, ["all", "corrected", "original"], "all"),
    liquidKind: typeof query.tipo === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(query.tipo) ? query.tipo : "all",
    liquidOrigin: pick(query.origemLiquido, ["all", "client", "professional"], "all"),
    activityFilter: pick(query.atividade, ["all", "yes", "no"], "all"),
    activityCorrection: pick(query.atividadeCorrecao, ["all", "corrected", "original"], "all"),
    activityOrigin: pick(query.origemAtividade, ["all", "client", "professional"], "all"),
    activitySort: pick(query.ordemAtividade, ["newest", "oldest"], "newest"),
    liquidPage: page(query.lp),
    activityPage: page(query.ap),
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
}>(events: readonly T[], options: CheckinExploreOptions, clientProfileId?: string | null) {
  const filtered = events.filter(e =>
    (options.liquidKind === "all" || e.effectiveLiquidKind === options.liquidKind) &&
    (options.liquidCorrection === "all" || e.wasCorrected === (options.liquidCorrection === "corrected")) &&
    matchesOrigin(e.recorded_by_profile_id, clientProfileId, options.liquidOrigin)
  ).slice().sort((a, b) => {
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
}>(events: readonly T[], options: CheckinExploreOptions, clientProfileId?: string | null) {
  const filtered = events.filter(e =>
    (options.activityFilter === "all" || e.didActivityEffective === (options.activityFilter === "yes")) &&
    (options.activityCorrection === "all" || e.wasCorrected === (options.activityCorrection === "corrected")) &&
    matchesOrigin(e.recorded_by_profile_id, clientProfileId, options.activityOrigin)
  ).slice().sort((a, b) => {
    const byDate = (b.checkin_date ?? "").localeCompare(a.checkin_date ?? "");
    const newer = byDate || compareCheckinEventInstants(a, b);
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
    correcao: options.liquidCorrection,
    tipo: options.liquidKind,
    origemLiquido: options.liquidOrigin,
    atividade: options.activityFilter,
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
    for (const key of ["ordem", "correcao", "tipo", "origemLiquido", "lp"]) delete query[key];
  } else {
    for (const key of ["atividade", "atividadeCorrecao", "origemAtividade", "ordemAtividade", "ap"]) delete query[key];
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
    ? { ...options, liquidKind: "all", liquidOrigin: "all", liquidCorrection: "all", liquidPage: 1 }
    : { ...options, activityFilter: "all", activityOrigin: "all", activityCorrection: "all", activityPage: 1 };
  const fallback = pageFor(relaxed);
  if (fallback === null) return options;
  return section === "liquid" ? { ...relaxed, liquidPage: fallback } : { ...relaxed, activityPage: fallback };
}
