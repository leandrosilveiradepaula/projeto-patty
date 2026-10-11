export type CheckinExploreSort = "newest" | "oldest" | "amount-desc";
export type CheckinExploreCorrection = "all" | "corrected" | "original";
export type CheckinExploreActivity = "all" | "yes" | "no";
export type CheckinExploreOptions = {
  liquidSort: CheckinExploreSort;
  liquidCorrection: CheckinExploreCorrection;
  liquidKind: string;
  activityFilter: CheckinExploreActivity;
  activityCorrection: CheckinExploreCorrection;
  liquidPage: number;
  activityPage: number;
};
export const CHECKIN_EXPLORER_PAGE_SIZE = 12;
function pick(value: unknown, allowed: readonly string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
export function readCheckinExploreOptions(query: Record<string, unknown>): CheckinExploreOptions {
  const page = (value: unknown) => {
    if (typeof value !== "string" || !/^[1-9][0-9]{0,4}$/.test(value)) return 1;
    return Math.min(Number(value), 10000);
  };
  return {
    liquidSort: pick(query.ordem, ["newest", "oldest", "amount-desc"], "newest") as CheckinExploreSort,
    liquidCorrection: pick(query.correcao, ["all", "corrected", "original"], "all") as CheckinExploreCorrection,
    liquidKind: typeof query.tipo === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(query.tipo) ? query.tipo : "all",
    activityFilter: pick(query.atividade, ["all", "yes", "no"], "all") as CheckinExploreActivity,
    activityCorrection: pick(query.atividadeCorrecao, ["all", "corrected", "original"], "all") as CheckinExploreCorrection,
    liquidPage: page(query.lp),
    activityPage: page(query.ap),
  };
}
export function exploreLiquidCheckins<T extends {id:string;recorded_at:string;effectiveAmountMl:number;effectiveLiquidKind:string;wasCorrected:boolean}>(
  events: readonly T[], options: CheckinExploreOptions,
) {
  const filtered = events.filter(e =>
    (options.liquidKind === "all" || e.effectiveLiquidKind === options.liquidKind) &&
    (options.liquidCorrection === "all" || e.wasCorrected === (options.liquidCorrection === "corrected"))
  ).slice().sort((a,b) => {
    if (options.liquidSort === "amount-desc") return b.effectiveAmountMl - a.effectiveAmountMl || b.recorded_at.localeCompare(a.recorded_at) || b.id.localeCompare(a.id);
    return (options.liquidSort === "oldest" ? a.recorded_at.localeCompare(b.recorded_at) : b.recorded_at.localeCompare(a.recorded_at)) || b.id.localeCompare(a.id);
  });
  return paginateCheckinEvents(filtered, options.liquidPage);
}
export function exploreActivityCheckins<T extends {id:string;recorded_at:string;didActivityEffective:boolean;wasCorrected:boolean}>(
  events: readonly T[], options: CheckinExploreOptions,
) {
  const filtered = events.filter(e =>
    (options.activityFilter === "all" || e.didActivityEffective === (options.activityFilter === "yes")) &&
    (options.activityCorrection === "all" || e.wasCorrected === (options.activityCorrection === "corrected"))
  );
  return paginateCheckinEvents(filtered, options.activityPage);
}
export function paginateCheckinEvents<T>(events: readonly T[], requestedPage:number) {
  const total=events.length;
  const pages=Math.max(1,Math.ceil(total/CHECKIN_EXPLORER_PAGE_SIZE));
  const page=Math.max(1,Math.min(requestedPage,pages));
  return {items:events.slice((page-1)*CHECKIN_EXPLORER_PAGE_SIZE,page*CHECKIN_EXPLORER_PAGE_SIZE),total,page,pages};
}
export function checkinExploreHref(base:string, query:Record<string,string|undefined>, patch:Record<string,string>) {
  const search=new URLSearchParams();
  for(const [key,val] of Object.entries({...query,...patch})) if(val && val!=="all" && val!=="1") search.set(key,val);
  return base+(search.size?"?"+search.toString():"");
}
