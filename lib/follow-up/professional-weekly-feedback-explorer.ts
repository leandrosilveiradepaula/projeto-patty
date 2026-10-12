export type ProfessionalFeedbackFilter = "all" | "manual" | "schedule";
export type ProfessionalFeedbackHistoryQuery = {
  origem?: unknown; ano?: unknown; pendentes?: unknown; enviados?: unknown;
};
export type ProfessionalFeedbackHistoryOptions = {
  origin: ProfessionalFeedbackFilter;
  year: string;
  pendingPage: number;
  submittedPage: number;
  invalid: boolean;
};
export function professionalFeedbackYears(rows:readonly {period_start:string}[]):string[]{
  return [...new Set(rows.map(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.period_start)?row.period_start.slice(0,4):"").filter(Boolean))].sort().reverse();
}
const validPage=(raw:unknown)=>typeof raw==="string" && /^[1-9][0-9]{0,5}$/.test(raw);
export function readProfessionalFeedbackHistoryQuery(raw:ProfessionalFeedbackHistoryQuery,years:readonly string[]=[]):ProfessionalFeedbackHistoryOptions {
  const origin=raw.origem==="manual" || raw.origem==="schedule" ? raw.origem : "all";
  return {
    origin,
    year:typeof raw.ano==="string"&&years.includes(raw.ano)?raw.ano:"all",
    pendingPage:validPage(raw.pendentes)?Number(raw.pendentes):1,
    submittedPage:validPage(raw.enviados)?Number(raw.enviados):1,
    invalid:(raw.ano!==undefined&&raw.ano!=="all"&&!(typeof raw.ano==="string"&&years.includes(raw.ano)))
      ||(raw.origem!==undefined && raw.origem!=="all" && raw.origem!==origin)
      || (raw.pendentes!==undefined && !validPage(raw.pendentes))
      || (raw.enviados!==undefined && !validPage(raw.enviados)),
  };
}
export function filterProfessionalFeedbacks<T extends { request_source: string; submitted_at: string|null; period_start?: string }>(
  rows:readonly T[],origin:ProfessionalFeedbackFilter,submitted:boolean,year="all",
):T[]{
  return rows.filter(row=>(submitted?row.submitted_at!==null:row.submitted_at===null)
    && (origin==="all" || row.request_source===origin)
    && (year==="all" || row.period_start?.startsWith(year+"-")));

}
export const PROFESSIONAL_WEEKLY_FEEDBACK_PAGE_SIZE=10;
export function paginateProfessionalFeedbacks<T>(rows:readonly T[],requested:number){
 const pageCount=Math.max(1,Math.ceil(rows.length/PROFESSIONAL_WEEKLY_FEEDBACK_PAGE_SIZE));
 const page=Number.isSafeInteger(requested)?Math.max(1,Math.min(requested,pageCount)):1;
 const start=(page-1)*PROFESSIONAL_WEEKLY_FEEDBACK_PAGE_SIZE;
 return {items:rows.slice(start,start+PROFESSIONAL_WEEKLY_FEEDBACK_PAGE_SIZE),
  page,pageCount,total:rows.length,first:rows.length?start+1:0,
  last:Math.min(rows.length,start+PROFESSIONAL_WEEKLY_FEEDBACK_PAGE_SIZE)};
}
export function professionalFeedbackHistoryHref(
 clientId:string,options:Pick<ProfessionalFeedbackHistoryOptions,"origin"|"year"|"pendingPage"|"submittedPage">,
 section:"pending"|"submitted",
){
 const params=new URLSearchParams();
 if(options.origin!=="all")params.set("origem",options.origin);
 if(options.year!=="all")params.set("ano",options.year);
 if(options.pendingPage>1)params.set("pendentes",String(options.pendingPage));
 if(options.submittedPage>1)params.set("enviados",String(options.submittedPage));
 const query=params.toString();
 return "/admin/clientes/"+encodeURIComponent(clientId)+"/feedback-semanal"+(query?"?"+query:"")+
   (section==="pending"?"#feedback-pendentes":"#feedback-enviados");
}
