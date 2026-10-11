import { normalizedReleasedContentSearch, paginateReleasedContent } from "./release-explorer.ts";
import { newestClientContentReleases } from "./release-order.ts";
export type ProfessionalReleaseFilters = { query: string; availability: "all"|"available"|"missing"; order:"newest"|"oldest"|"title"; page:number };
export function readProfessionalReleaseOptions(raw: Record<string,unknown>): ProfessionalReleaseFilters {
 return {query: typeof raw.q==="string" ? raw.q.trim().slice(0,160):"",availability:raw.arquivo==="available"||raw.arquivo==="missing"?raw.arquivo:"all",order:raw.ordem==="oldest"||raw.ordem==="title"?raw.ordem:"newest",page:typeof raw.pagina==="string"&&/^[1-9][0-9]{0,3}$/.test(raw.pagina)?Number(raw.pagina):1};
}
export type ReleaseRow = {id:string;released_at:string;educational_content_versions:{id:string;title:string;category_key:string|null;content_type_key:string|null}|null};
export function filterProfessionalReleases<T extends ReleaseRow>(rows:readonly T[],assets:ReadonlyMap<string,number>,filters:ProfessionalReleaseFilters){
 const query=normalizedReleasedContentSearch(filters.query);
 const filtered=newestClientContentReleases(rows).filter(row=>{
 const version=row.educational_content_versions;if(!version)return false;
 const count=assets.get(version.id)??0;
 return (filters.availability==="all"||(filters.availability==="available"?count>0:count===0))&&(!query||normalizedReleasedContentSearch([version.title,version.category_key,version.content_type_key].filter(Boolean).join(" ")).includes(query));
 });
 const ordered=filters.order==="oldest"?[...filtered].reverse():filters.order==="title"?[...filtered].sort((a,b)=>(a.educational_content_versions?.title??"").localeCompare(b.educational_content_versions?.title??"","pt-BR",{sensitivity:"base"})||a.id.localeCompare(b.id)):filtered;
 const result=paginateReleasedContent(ordered,filters.page);
 return {...result,previous:result.page>1?result.page-1:null,next:result.page<result.pages?result.page+1:null};
}
export function professionalReleaseHref(base:string,filters:ProfessionalReleaseFilters,page:number){
 const params=new URLSearchParams();if(filters.query)params.set("q",filters.query);if(filters.availability!=="all")params.set("arquivo",filters.availability);if(filters.order!=="newest")params.set("ordem",filters.order);if(page>1)params.set("pagina",String(page));return base+(params.size?"?"+params.toString():"")+"#historico-liberacoes";
}
