import { PENDING_AREA_BY_KIND, parsePendingArea, type PendingArea } from "./pending-area-filter.ts";
import type { OperationalPendingItem, OperationalPendingItemKind, OperationalPendingGroup } from "./pending.ts";
import { normalizeClientDirectorySearch } from "../clients/client-directory-search.ts";
export type PendingExplorerQuery = { q?: unknown; tipo?: unknown; area?: unknown };
export function readPendingExplorerQuery(raw:PendingExplorerQuery,knownKinds:readonly OperationalPendingItemKind[]){
 const query=typeof raw.q==="string"?raw.q.trim().slice(0,120):"";
 const kind=typeof raw.tipo==="string"&&knownKinds.includes(raw.tipo as OperationalPendingItemKind)?raw.tipo:"all";
 const area=parsePendingArea(raw.area);
 return {query,kind,area,invalid:(raw.area!==undefined&&raw.area!==""&&raw.area!==area&&raw.area!=="all")||(raw.q!==undefined&&typeof raw.q!=="string")
   ||(raw.tipo!==undefined&&raw.tipo!=="all"&&raw.tipo!==kind)};
}
export function explorePendingClientQueue<T extends OperationalPendingItem>(
 items:readonly T[],state:{query:string;kind:string;area?:PendingArea|null},
):T[]{
 const q=normalizeClientDirectorySearch(state.query);
 return items.filter(item=>(!q||normalizeClientDirectorySearch(item.clientLabel).includes(q))
   &&(state.kind==="all"||item.kind===state.kind)
   &&(!state.area||PENDING_AREA_BY_KIND[item.kind]===state.area));
}
export function pendingExplorerGroupHref(group:OperationalPendingGroup,state:{query:string;kind:string;area?:PendingArea|null}){
 const params=new URLSearchParams();
 params.set("grupo",group);
 if(state.query)params.set("q",state.query);
 if(state.kind!=="all")params.set("tipo",state.kind);
 if(state.area)params.set("area",state.area);
 const hash=group==="patty"?"acao-da-patty":group==="client"?"aguardando-cliente":"operacional-do-sistema";
 return "/admin/pendencias?"+params.toString()+"#"+hash;
}
