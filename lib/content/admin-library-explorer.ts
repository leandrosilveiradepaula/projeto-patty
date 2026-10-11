import {summarizeLibraryVersions,type VersionPublicationSummary} from "./admin-library-status.ts";
export type LibraryExplorerVersion={
 id:string; educational_content_id:string;version_number:number;title:string;
 category_key:string|null;content_type_key:string|null;phase_key:string|null;
 display_order:number;published_at:string|null;created_at:string;
};
export type LibraryExplorerState="all"|"draft-only"|"published-current"|"published-with-draft"|"any-published";
export type LibraryExplorerOrder="display"|"title"|"created-recent"|"created-oldest"|"published-recent"|"version";
export type LibraryExplorerFilters={query:string;state:LibraryExplorerState;category:string;type:string;order:LibraryExplorerOrder;page:number;invalidPage:boolean};
export const LIBRARY_EXPLORER_PAGE_SIZE=12;
function normal(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();}
export function readLibraryExplorerFilters(raw:Record<string,unknown>):LibraryExplorerFilters{
 const states=["all","draft-only","published-current","published-with-draft","any-published"];
 const sorts=["display","title","created-recent","created-oldest","published-recent","version"];
 const validPage=raw.pagina===undefined||typeof raw.pagina==="string"&&/^[1-9][0-9]{0,3}$/.test(raw.pagina);
 return {
  query:typeof raw.q==="string"?raw.q.trim().slice(0,120):"",
  state:states.includes(String(raw.estado))?raw.estado as LibraryExplorerState:"all",
  category:typeof raw.categoria==="string"?raw.categoria.slice(0,120):"all",
  type:typeof raw.tipo==="string"?raw.tipo.slice(0,120):"all",
  order:sorts.includes(String(raw.ordem))?raw.ordem as LibraryExplorerOrder:"display",
  page:validPage&&raw.pagina!==undefined?Number(raw.pagina):1,invalidPage:!validPage,
 };
}
function time(value:string|null){
 const n=value?Date.parse(value):NaN;return Number.isFinite(n)?n:null;
}
function compareTime(left:string|null,right:string|null,asc:boolean){
 const a=time(left),b=time(right);
 if(a===null)return b===null?0:1;if(b===null)return -1;
 return asc?a-b:b-a;
}
function classification(summary:VersionPublicationSummary<LibraryExplorerVersion>){
 if(!summary.latestPublishedVersion)return "draft-only" as const;
 return summary.latestVersion.published_at?"published-current" as const:"published-with-draft" as const;
}
export function exploreAdminEducationalLibrary(
 versions:readonly LibraryExplorerVersion[],filters:LibraryExplorerFilters,
){
 const summaries=[...summarizeLibraryVersions(versions,v=>v.educational_content_id).values()];
 const facets={
  categories:[...new Set(summaries.map(s=>s.latestVersion.category_key??"Não informado"))].sort((a,b)=>a.localeCompare(b,"pt-BR")),
  types:[...new Set(summaries.map(s=>s.latestVersion.content_type_key??"Não informado"))].sort((a,b)=>a.localeCompare(b,"pt-BR")),
 };
 const query=normal(filters.query);
 const matched=summaries.filter(s=>{
  const v=s.latestVersion,p=s.latestPublishedVersion,status=classification(s);
  if(filters.state!=="all"&&filters.state!=="any-published"&&filters.state!==status)return false;
  if(filters.state==="any-published"&&!p)return false;
  if(filters.category!=="all"&&(v.category_key??"Não informado")!==filters.category)return false;
  if(filters.type!=="all"&&(v.content_type_key??"Não informado")!==filters.type)return false;
  if(!query)return true;
  return [v,p].some(x=>x&&normal([x.title,x.category_key??"",x.content_type_key??"",x.phase_key??""].join(" ")).includes(query));
 });
 const sorted=matched.sort((a,b)=>{
  const av=a.latestVersion,bv=b.latestVersion;
  let diff=0;
  if(filters.order==="title")diff=av.title.localeCompare(bv.title,"pt-BR",{sensitivity:"base"});
  if(filters.order==="display")diff=av.display_order-bv.display_order;
  if(filters.order==="version")diff=bv.version_number-av.version_number;
  if(filters.order==="created-recent")diff=compareTime(av.created_at,bv.created_at,false);
  if(filters.order==="created-oldest")diff=compareTime(av.created_at,bv.created_at,true);
  if(filters.order==="published-recent")diff=compareTime(a.latestPublishedVersion?.published_at??null,b.latestPublishedVersion?.published_at??null,false);
  return diff||av.educational_content_id.localeCompare(bv.educational_content_id);
 });
 const pages=Math.max(1,Math.ceil(sorted.length/LIBRARY_EXPLORER_PAGE_SIZE));
 const page=Math.min(filters.page,pages),start=(page-1)*LIBRARY_EXPLORER_PAGE_SIZE;
 const counters={total:summaries.length,draftOnly:0,publishedCurrent:0,publishedWithDraft:0};
 for(const summary of summaries){const status=classification(summary);if(status==="draft-only")counters.draftOnly++;if(status==="published-current")counters.publishedCurrent++;if(status==="published-with-draft")counters.publishedWithDraft++;}
 return {items:sorted.slice(start,start+LIBRARY_EXPLORER_PAGE_SIZE),total:sorted.length,page,pages,from:sorted.length?start+1:0,to:Math.min(start+LIBRARY_EXPLORER_PAGE_SIZE,sorted.length),previous:page>1?page-1:null,next:page<pages?page+1:null,invalidPage:filters.invalidPage||filters.page>pages,facets,counters};
}
export function adminEducationalLibraryHref(filters:LibraryExplorerFilters,page:number){
 const p=new URLSearchParams();
 if(filters.query)p.set("q",filters.query);
 if(filters.state!=="all")p.set("estado",filters.state);
 if(filters.category!=="all")p.set("categoria",filters.category);
 if(filters.type!=="all")p.set("tipo",filters.type);
 if(filters.order!=="display")p.set("ordem",filters.order);
 if(page>1&&Number.isSafeInteger(page))p.set("pagina",String(page));
 return "/admin/conteudos"+(p.size?"?"+p.toString():"")+"#biblioteca-conteudos";
}
