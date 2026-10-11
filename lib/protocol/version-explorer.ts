import {requestedProtocolVersion} from "./history-navigation.ts";
export const PROTOCOL_VERSION_PAGE_SIZE=8;
export type VersionFilter={
  term:string;status:"all"|"draft"|"review"|"approved"|"published";
  order:"newest"|"oldest";structure:"all"|"with-plan"|"without-plan"|"with-cycles"|"with-doses";page:number;invalid:boolean;
};
export type VersionFact={id:string;version_number:number;submitted_for_review_at:string|null};
export function parseVersionFilter(raw:Record<string,unknown>):VersionFilter{
 const rawPage=raw.pagina;
 const valid=rawPage===undefined||(typeof rawPage==="string"&&/^[1-9][0-9]{0,3}$/.test(rawPage));
 return {term:typeof raw.buscar==="string"?raw.buscar.trim().slice(0,120):"",
 status:["draft","review","approved","published"].includes(String(raw.estado))?raw.estado as VersionFilter["status"]:"all",
 order:raw.ordem==="oldest"?"oldest":"newest",
 structure:["with-plan","without-plan","with-cycles","with-doses"].includes(String(raw.estrutura))?raw.estrutura as VersionFilter["structure"]:"all",
 page:valid&&rawPage!==undefined?Number(rawPage):1,invalid:!valid};
}
export function exploreProtocolVersions<T extends VersionFact>(
  versions:readonly T[],
  approved:ReadonlySet<string>,published:ReadonlySet<string>,
  filter:VersionFilter, requested:unknown,
  structures:ReadonlyMap<string,ProtocolVersionStructureFact>=new Map(),
){
 const search=filter.term;
 const found=versions.filter(v=>{
  if(search&&!String(v.version_number).includes(search))return false;
  const plan=structures.get(v.id);
  if(filter.structure==="with-plan"&&!plan?.hasPlan)return false;
  if(filter.structure==="without-plan"&&plan?.hasPlan)return false;
  if(filter.structure==="with-cycles"&&!(plan?.cycleCount && plan.cycleCount>0))return false;
  if(filter.structure==="with-doses"&&!(plan?.allocationCount && plan.allocationCount>0))return false;
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
 if(filter.structure!=="all")params.set("estrutura",filter.structure);
 if(page>1)params.set("pagina",String(page));
 if(selected!==undefined&&selected!==null)params.set("versao",String(selected));
 return base+(params.size?"?"+params.toString():"")+"#historico-versoes-protocolo";
}

export type ProtocolVersionStructureFact={
 hasPlan:boolean;variantCount:number;mealCount:number;cycleCount:number;stepCount:number;allocationCount:number;
};
/** Only saved plans tied to the exact version count as present. */
export function indexProtocolVersionStructures(
 plans:readonly {protocolVersionId:string;variants:readonly {meals:readonly {doseAllocations:readonly unknown[]}[]}[];cycles:readonly {steps:readonly unknown[]}[]}[],
) {
 const index=new Map<string,ProtocolVersionStructureFact>();
 for(const plan of plans){
  if(index.has(plan.protocolVersionId))continue;
  const mealCount=plan.variants.reduce((n,v)=>n+v.meals.length,0);
  const allocationCount=plan.variants.reduce((n,v)=>n+v.meals.reduce((subtotal,m)=>subtotal+m.doseAllocations.length,0),0);
  index.set(plan.protocolVersionId,{
   hasPlan:true,variantCount:plan.variants.length,mealCount,cycleCount:plan.cycles.length,
   stepCount:plan.cycles.reduce((n,c)=>n+c.steps.length,0),allocationCount,
  });
 }
 return index;
}
export function summarizeProtocolVersionArchive<T extends VersionFact>(
 versions:readonly T[],approved:ReadonlySet<string>,published:ReadonlySet<string>,
 structures:ReadonlyMap<string,ProtocolVersionStructureFact>,
) {
 return {
  total:versions.length,
  draft:versions.filter(v=>!v.submitted_for_review_at&&!approved.has(v.id)&&!published.has(v.id)).length,
  review:versions.filter(v=>Boolean(v.submitted_for_review_at)&&!approved.has(v.id)&&!published.has(v.id)).length,
  approved:versions.filter(v=>approved.has(v.id)&&!published.has(v.id)).length,
  published:versions.filter(v=>published.has(v.id)).length,
  missingPlan:versions.filter(v=>!structures.get(v.id)?.hasPlan).length,
  withCycles:versions.filter(v=>(structures.get(v.id)?.cycleCount??0)>0).length,
  withDoses:versions.filter(v=>(structures.get(v.id)?.allocationCount??0)>0).length,
 };
}
