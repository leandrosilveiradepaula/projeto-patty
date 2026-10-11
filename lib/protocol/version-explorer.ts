import {requestedProtocolVersion} from "./history-navigation.ts";
export const PROTOCOL_VERSION_PAGE_SIZE=8;
export type VersionFilter={
  term:string;status:"all"|"draft"|"review"|"approved"|"published";
  order:"newest"|"oldest";page:number;invalid:boolean;
};
export type VersionFact={id:string;version_number:number;submitted_for_review_at:string|null};
export function parseVersionFilter(raw:Record<string,unknown>):VersionFilter{
 const rawPage=raw.pagina;
 const valid=rawPage===undefined||(typeof rawPage==="string"&&/^[1-9][0-9]{0,3}$/.test(rawPage));
 return {term:typeof raw.buscar==="string"?raw.buscar.trim().slice(0,120):"",
 status:["draft","review","approved","published"].includes(String(raw.estado))?raw.estado as VersionFilter["status"]:"all",
 order:raw.ordem==="oldest"?"oldest":"newest",
 page:valid&&rawPage!==undefined?Number(rawPage):1,invalid:!valid};
}
export function exploreProtocolVersions<T extends VersionFact>(
  versions:readonly T[],
  approved:ReadonlySet<string>,published:ReadonlySet<string>,
  filter:VersionFilter, requested:unknown,
){
 const search=filter.term;
 const found=versions.filter(v=>{
  if(search&&!String(v.version_number).includes(search))return false;
  const status=published.has(v.id)?"published":approved.has(v.id)?"approved":v.submitted_for_review_at?"review":"draft";
  return filter.status==="all"||filter.status===status;
 }).sort((a,b)=>filter.order==="oldest"?a.version_number-b.version_number||a.id.localeCompare(b.id):b.version_number-a.version_number||a.id.localeCompare(b.id));
 const selected=requestedProtocolVersion(requested,versions);
 const selectedIndex=selected===null?-1:found.findIndex(v=>v.version_number===selected);
 const pages=Math.max(1,Math.ceil(found.length/PROTOCOL_VERSION_PAGE_SIZE));
 const target=selectedIndex>=0?Math.floor(selectedIndex/PROTOCOL_VERSION_PAGE_SIZE)+1:filter.page;
 const page=Math.min(Math.max(1,target),pages);
 const from=(page-1)*PROTOCOL_VERSION_PAGE_SIZE;
 return {items:found.slice(from,from+PROTOCOL_VERSION_PAGE_SIZE),total:found.length,
  page,pages,from:found.length?from+1:0,to:Math.min(from+PROTOCOL_VERSION_PAGE_SIZE,found.length),
  previous:page>1?page-1:null,next:page<pages?page+1:null,
  invalid:filter.invalid||filter.page>pages,
  selectedHidden:selected!==null&&selectedIndex<0,
 };
}
export function protocolVersionExplorerHref(base:string,filter:VersionFilter,page:number,selected?:number|null){
 const params=new URLSearchParams();
 if(filter.term)params.set("buscar",filter.term);
 if(filter.status!=="all")params.set("estado",filter.status);
 if(filter.order!=="newest")params.set("ordem",filter.order);
 if(page>1)params.set("pagina",String(page));
 if(selected!==undefined&&selected!==null)params.set("versao",String(selected));
 return base+(params.size?"?"+params.toString():"")+"#historico-versoes-protocolo";
}
