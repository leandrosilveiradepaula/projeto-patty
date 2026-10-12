export type ClientFeedbackHistoryQuery = { origem?: unknown; ano?: unknown; pagina?: unknown };
export type ClientFeedbackHistoryFilters = { origin: "all" | "manual" | "schedule"; year: string; page: number; invalid: boolean };
export const CLIENT_FEEDBACK_HISTORY_PAGE_SIZE = 10;
export function availableClientFeedbackHistoryYears(rows: readonly {period_start:string}[]):string[]{
  return [...new Set(rows.map(row => /^\d{4}-\d{2}-\d{2}$/.test(row.period_start) ? row.period_start.slice(0,4) : "")
    .filter(Boolean))].sort().reverse();
}
export function readClientFeedbackHistoryQuery(query:ClientFeedbackHistoryQuery,years:readonly string[]):ClientFeedbackHistoryFilters{
 const origin=query.origem==="manual"||query.origem==="schedule"?query.origem:"all";
 const year=typeof query.ano==="string"&&years.includes(query.ano)?query.ano:"all";
 const validPage=typeof query.pagina==="string"&&/^[1-9][0-9]{0,5}$/.test(query.pagina);
 const page=validPage?Number(query.pagina):1;
 return {origin,year,page,invalid:
  (query.origem!==undefined&&query.origem!=="all"&&query.origem!==origin)||
  (query.ano!==undefined&&query.ano!=="all"&&query.ano!==year)||
  (query.pagina!==undefined&&!validPage)};
}
export function exploreClientFeedbackHistory<T extends {period_start:string;request_source:string}>(
 rows:readonly T[], filters:ClientFeedbackHistoryFilters,
){
 const filtered=rows.filter(row=>(filters.origin==="all"||row.request_source===filters.origin)
   &&(filters.year==="all"||row.period_start.startsWith(filters.year+"-")));
 const pages=Math.max(1,Math.ceil(filtered.length/CLIENT_FEEDBACK_HISTORY_PAGE_SIZE));
 const page=Math.min(Math.max(1,filters.page),pages);
 const start=(page-1)*CLIENT_FEEDBACK_HISTORY_PAGE_SIZE;
 return {items:filtered.slice(start,start+CLIENT_FEEDBACK_HISTORY_PAGE_SIZE),
  total:filtered.length, pages, page, from:filtered.length?start+1:0,
  to:Math.min(filtered.length,start+CLIENT_FEEDBACK_HISTORY_PAGE_SIZE)};
}
export function clientFeedbackHistoryHref(filters:Pick<ClientFeedbackHistoryFilters,"origin"|"year">,page:number){
 const p=new URLSearchParams();
 if(filters.origin!=="all")p.set("origem",filters.origin);
 if(filters.year!=="all")p.set("ano",filters.year);
 if(page>1&&Number.isSafeInteger(page))p.set("pagina",String(page));
 const q=p.toString();
 return "/cliente/feedback-semanal"+(q?"?"+q:"")+"#historico-enviado";
}
