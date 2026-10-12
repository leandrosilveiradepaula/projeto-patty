import type { OperationalPendingItem, OperationalPendingItemKind, OperationalPendingGroup } from "./pending.ts";
import { normalizeClientDirectorySearch } from "../clients/client-directory-search.ts";
export type PendingExplorerQuery = { q?: unknown; tipo?: unknown };
export function readPendingExplorerQuery(raw:PendingExplorerQuery,knownKinds:readonly OperationalPendingItemKind[]){
 const query=typeof raw.q==="string"?raw.q.trim().slice(0,120):"";
 const kind=typeof raw.tipo==="string"&&knownKinds.includes(raw.tipo as OperationalPendingItemKind)?raw.tipo:"all";
 return {query,kind,invalid:(raw.q!==undefined&&typeof raw.q!=="string")
   ||(raw.tipo!==undefined&&raw.tipo!=="all"&&raw.tipo!==kind)};
}
export function explorePendingClientQueue<T extends OperationalPendingItem>(
 items:readonly T[],state:{query:string;kind:string},
):T[]{
 const q=normalizeClientDirectorySearch(state.query);
 return items.filter(item=>(!q||normalizeClientDirectorySearch(item.clientLabel).includes(q))
   &&(state.kind==="all"||item.kind===state.kind));
}
export function pendingExplorerGroupHref(group:OperationalPendingGroup,state:{query:string;kind:string}){
 const params=new URLSearchParams();
 params.set("grupo",group);
 if(state.query)params.set("q",state.query);
 if(state.kind!=="all")params.set("tipo",state.kind);
 const hash=group==="patty"?"acao-da-patty":group==="client"?"aguardando-cliente":"operacional-do-sistema";
 return "/admin/pendencias?"+params.toString()+"#"+hash;
}
