import { PENDING_AREA_BY_KIND, parsePendingArea, type PendingArea } from "./pending-area-filter.ts";
import type { OperationalPendingItem, OperationalPendingItemKind, OperationalPendingGroup } from "./pending.ts";
import { getOperationalPendingGroup } from "./pending.ts";
import { normalizeClientDirectorySearch } from "../clients/client-directory-search.ts";

export type PendingExplorerSort = "oldest" | "newest" | "client-asc" | "client-desc" | "type";
export type PendingExplorerQuery = {
 q?: unknown; tipo?: unknown; area?: unknown; responsavel?: unknown; ordem?: unknown;
 ano?: unknown; mes?: unknown; dataInicial?: unknown; dataFinal?: unknown;
 integridadeData?: unknown; vinculo?: unknown; multiplas?: unknown;
 paginaPatty?: unknown; paginaCliente?: unknown; paginaSistema?: unknown;
};
export type PendingExplorerState = {
 query: string; kind: OperationalPendingItemKind | "all"; area: PendingArea | null;
 responsible: OperationalPendingGroup | "all"; sort: PendingExplorerSort;
 year: string; month: string; fromDate: string | null; toDate: string | null;
 dateValidity: "all" | "valid" | "invalid";
 clientScope: "all" | "client" | "system"; multiple: "all" | "multiple" | "single";
 pattyPage: number; clientPage: number; operationalPage: number;
 invalid: boolean;
};
export const PENDING_EXPLORER_MONTHS = Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));
export const PENDING_GROUP_PAGE_SIZE=15;

function pick<T extends string>(raw:unknown, options:readonly T[], fallback:T):{value:T;invalid:boolean}{
 if(raw===undefined||raw===fallback)return {value:fallback,invalid:false};
 return typeof raw==="string"&&options.includes(raw as T)
   ? {value:raw as T,invalid:false} : {value:fallback,invalid:true};
}
function parsePage(raw:unknown):{value:number;invalid:boolean}{
 if(raw===undefined||raw==="1")return {value:1,invalid:false};
 if(typeof raw!=="string"||!/^[1-9][0-9]{0,5}$/.test(raw))return {value:1,invalid:true};
 const value=Number(raw);return value>0&&value<=100000?{value,invalid:false}:{value:1,invalid:true};
}
function parseCivilDay(raw:unknown):{value:string|null;invalid:boolean}{
 if(raw===undefined||raw==="")return {value:null,invalid:false};
 if(typeof raw!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw))return {value:null,invalid:true};
 const date=new Date(raw+"T12:00:00Z");
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===raw
   ? {value:raw,invalid:false}:{value:null,invalid:true};
}
export function pendingQueueCivilDay(value:string):string|null{
 const epoch=Date.parse(value);
 if(!Number.isFinite(epoch))return null;
 return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(epoch));
}
export function pendingQueueYears(items:readonly Pick<OperationalPendingItem,"createdAt">[]):string[]{
 return [...new Set(items.map(item=>pendingQueueCivilDay(item.createdAt)?.slice(0,4)).filter((v):v is string=>Boolean(v)))].sort().reverse();
}
export function readPendingExplorerQuery(raw:PendingExplorerQuery,knownKinds:readonly OperationalPendingItemKind[],knownYears:readonly string[]=[]):PendingExplorerState{
 const query=typeof raw.q==="string"?raw.q.trim().slice(0,120):"";
 const kind=pick(raw.tipo,["all",...knownKinds] as const,"all" as const);
 const areaValue=raw.area===undefined||raw.area==="all"||raw.area===""?null:parsePendingArea(raw.area);
 const areaInvalid=raw.area!==undefined&&raw.area!==""&&raw.area!=="all"&&areaValue===null;
 const responsible=pick(raw.responsavel,["all","patty","client","operational"] as const,"all");
 const sort=pick(raw.ordem,["oldest","newest","client-asc","client-desc","type"] as const,"oldest");
 const year=pick(raw.ano,["all",...knownYears] as string[],"all");
 const month=pick(raw.mes,["all",...PENDING_EXPLORER_MONTHS],"all");
 const from=parseCivilDay(raw.dataInicial),to=parseCivilDay(raw.dataFinal);
 const inverse=from.value!==null&&to.value!==null&&from.value>to.value;
 const validity=pick(raw.integridadeData,["all","valid","invalid"] as const,"all");
 const scope=pick(raw.vinculo,["all","client","system"] as const,"all");
 const multiple=pick(raw.multiplas,["all","multiple","single"] as const,"all");
 const patty=parsePage(raw.paginaPatty),client=parsePage(raw.paginaCliente),operational=parsePage(raw.paginaSistema);
 return {
  query,kind:kind.value,area:areaValue,responsible:responsible.value,sort:sort.value,year:year.value,month:month.value,
  fromDate:inverse?null:from.value,toDate:inverse?null:to.value,
  dateValidity:validity.value,clientScope:scope.value,multiple:multiple.value,
  pattyPage:patty.value,clientPage:client.value,operationalPage:operational.value,
  invalid:areaInvalid||kind.invalid||responsible.invalid||sort.invalid||year.invalid||month.invalid||
    from.invalid||to.invalid||inverse||validity.invalid||scope.invalid||multiple.invalid||
    patty.invalid||client.invalid||operational.invalid||(raw.q!==undefined&&typeof raw.q!=="string"),
 };
}
/** The array is already scoped by the authenticated data-access read. No new fetch is performed. */
export function explorePendingClientQueue<T extends OperationalPendingItem>(
 items:readonly T[],state:{query:string;kind:string;area?:PendingArea|null;
 responsible?:OperationalPendingGroup|"all";sort?:PendingExplorerSort;year?:string;month?:string;
 fromDate?:string|null;toDate?:string|null;dateValidity?:"all"|"valid"|"invalid";
 clientScope?:"all"|"client"|"system";multiple?:"all"|"multiple"|"single"},
):T[]{
 const search=normalizeClientDirectorySearch(state.query);
 const candidates=items.filter(item=>{
  if(search&&!normalizeClientDirectorySearch(item.clientLabel).includes(search))return false;
  if(state.kind!=="all"&&item.kind!==state.kind)return false;
  if(state.area&&PENDING_AREA_BY_KIND[item.kind]!==state.area)return false;
  if(state.responsible&&state.responsible!=="all"&&getOperationalPendingGroup(item)!==state.responsible)return false;
  if(state.clientScope==="client"&&!item.clientId)return false;
  if(state.clientScope==="system"&&item.clientId)return false;
  const day=pendingQueueCivilDay(item.createdAt);
  if(state.dateValidity==="valid"&&!day)return false;
  if(state.dateValidity==="invalid"&&day)return false;
  if(state.year&&state.year!=="all"&&day?.slice(0,4)!==state.year)return false;
  if(state.month&&state.month!=="all"&&day?.slice(5,7)!==state.month)return false;
  if(state.fromDate&&(!day||day<state.fromDate))return false;
  if(state.toDate&&(!day||day>state.toDate))return false;
  return true;
 });
 const counts=new Map<string,number>();
 for(const item of candidates)if(item.clientId)counts.set(item.clientId,(counts.get(item.clientId)??0)+1);
 const filtered=candidates.filter(item=>!state.multiple||state.multiple==="all"||
   (item.clientId!==null&&((counts.get(item.clientId)??0)>1)===(state.multiple==="multiple")));
 const sort=state.sort??"oldest";
 if(sort==="oldest")return filtered;
 const time=(row:T):number=>{const date=Date.parse(row.createdAt);return Number.isFinite(date)?date:NaN;};
 return filtered.slice().sort((a,b)=>{
  const at=time(a),bt=time(b);
  const byDate= !Number.isFinite(at)||!Number.isFinite(bt)
   ? (!Number.isFinite(at)&&!Number.isFinite(bt)?0:!Number.isFinite(at)?1:-1)
   : (sort==="newest"?bt-at:at-bt);
  const name=a.clientLabel.localeCompare(b.clientLabel,"pt-BR",{sensitivity:"base"});
  const type=a.title.localeCompare(b.title,"pt-BR",{sensitivity:"base"});
  const priority=sort==="newest"?byDate:sort==="client-asc"?name:sort==="client-desc"?-name:type;
  return priority||byDate||a.id.localeCompare(b.id);
 });
}
export type PendingQueuePage<T>= {items:T[];page:number;pageCount:number;total:number;from:number;to:number;adjusted:boolean};
export function paginatePendingQueue<T>(items:readonly T[],requested:number):PendingQueuePage<T>{
 const pageCount=Math.max(1,Math.ceil(items.length/PENDING_GROUP_PAGE_SIZE));
 const safe=Number.isSafeInteger(requested)&&requested>0?requested:1;
 const page=Math.min(safe,pageCount);
 const from=(page-1)*PENDING_GROUP_PAGE_SIZE;
 const selected=items.slice(from,from+PENDING_GROUP_PAGE_SIZE);
 return {items:selected,page,pageCount,total:items.length,from:items.length?from+1:0,
   to:from+selected.length,adjusted:safe!==page};
}
export function countPendingQueueClients(items:readonly Pick<OperationalPendingItem,"clientId">[]):number{
 return new Set(items.map(x=>x.clientId).filter((x):x is string=>Boolean(x))).size;
}
export function pendingQueueOldestDate(items:readonly Pick<OperationalPendingItem,"createdAt">[]):string|null{
 let oldest=Infinity;
 for(const item of items){const t=Date.parse(item.createdAt);if(Number.isFinite(t)&&t<oldest)oldest=t;}
 return Number.isFinite(oldest)?new Date(oldest).toISOString():null;
}
function safeStateParams(state:{query:string;kind:string;area?:PendingArea|null;
 responsible?:OperationalPendingGroup|"all";sort?:PendingExplorerSort;year?:string;month?:string;
 fromDate?:string|null;toDate?:string|null;dateValidity?:"all"|"valid"|"invalid";
 clientScope?:"all"|"client"|"system";multiple?:"all"|"multiple"|"single";
 pattyPage?:number;clientPage?:number;operationalPage?:number}):URLSearchParams{
 const params=new URLSearchParams();
 if(state.query)params.set("q",state.query.slice(0,120));
 if(state.kind!=="all")params.set("tipo",state.kind);
 if(state.area)params.set("area",state.area);
 if(state.responsible&&state.responsible!=="all")params.set("responsavel",state.responsible);
 if(state.sort&&state.sort!=="oldest")params.set("ordem",state.sort);
 if(state.year&&state.year!=="all")params.set("ano",state.year);
 if(state.month&&state.month!=="all")params.set("mes",state.month);
 if(state.fromDate)params.set("dataInicial",state.fromDate);
 if(state.toDate)params.set("dataFinal",state.toDate);
 if(state.dateValidity&&state.dateValidity!=="all")params.set("integridadeData",state.dateValidity);
 if(state.clientScope&&state.clientScope!=="all")params.set("vinculo",state.clientScope);
 if(state.multiple&&state.multiple!=="all")params.set("multiplas",state.multiple);
 for(const [key,page] of [["paginaPatty",state.pattyPage],["paginaCliente",state.clientPage],["paginaSistema",state.operationalPage]] as const){
  if(page&&page>1)params.set(key,String(page));
 }
 return params;
}
export function pendingExplorerGroupHref(group:OperationalPendingGroup,state:Parameters<typeof safeStateParams>[0]){
 const params=new URLSearchParams();
 params.set("grupo",group);
 for(const [key,value] of safeStateParams(state).entries())params.set(key,value);
 const hash=group==="patty"?"acao-da-patty":group==="client"?"aguardando-cliente":"operacional-do-sistema";
 return "/admin/pendencias?"+params.toString()+"#"+hash;
}
export function pendingExplorerPageHref(group:OperationalPendingGroup,state:Parameters<typeof safeStateParams>[0],page:number){
 const scoped={...state,...(group==="patty"?{pattyPage:page}:group==="client"?{clientPage:page}:{operationalPage:page})};
 return pendingExplorerGroupHref(group,scoped);
}
