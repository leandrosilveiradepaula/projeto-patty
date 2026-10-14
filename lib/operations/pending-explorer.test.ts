import assert from "node:assert/strict";
import test from "node:test";
import { readPendingExplorerQuery, explorePendingClientQueue, pendingExplorerGroupHref, pendingExplorerPageHref,pendingExplorerResetHref,paginatePendingQueue,visiblePendingQueuePages,pendingQueueYears,pendingQueueCivilDay,countPendingQueueClients,pendingQueueOldestDate } from "./pending-explorer.ts";
import type { OperationalPendingItem } from "./pending.ts";
const items:OperationalPendingItem[]=[
 {id:"a",clientId:"client-a",clientLabel:"Érica",createdAt:"2026-10-10T10:00:00Z",description:"",href:"/admin/a",kind:"assessment_draft",statusLabel:"Rascunho",title:"Avaliação"},
 {id:"b",clientId:"client-b",clientLabel:"Ana",createdAt:"2026-10-10T10:00:00Z",description:"",href:"/admin/b",kind:"protocol_draft",statusLabel:"Rascunho",title:"Protocolo"},
];
test("the professional pending queue filters only already scoped rows",()=>{
 assert.deepEqual(explorePendingClientQueue(items,{query:"erica",kind:"all"}).map(x=>x.id),["a"]);
 assert.deepEqual(explorePendingClientQueue(items,{query:"Ana",kind:"assessment_draft"}),[]);
 assert.equal(items.length,2);
});
test("invalid and repeated query filters cannot widen the queue",()=>{
 const known=items.map(x=>x.kind);
 const bad=readPendingExplorerQuery({q:["Ana"],tipo:"__proto__"},known);
 assert.equal(bad.invalid,true);
 assert.equal(bad.kind,"all");
 assert.equal(bad.query,"");
 const ok=readPendingExplorerQuery({q:" Érica ",tipo:"assessment_draft"},known);
 assert.equal(ok.invalid,false);
 assert.equal(pendingExplorerGroupHref("patty",ok),"/admin/pendencias?grupo=patty&q=%C3%89rica&tipo=assessment_draft#acao-da-patty");
});

test("area composes with existing client and type search without changing scoped items",()=>{
 const state=readPendingExplorerQuery({area:"assessments",q:"Érica"},items.map(i=>i.kind));
 assert.deepEqual(explorePendingClientQueue(items,state).map(i=>i.id),["a"]);
 assert.equal(pendingExplorerGroupHref("patty",state),"/admin/pendencias?grupo=patty&q=%C3%89rica&area=assessments#acao-da-patty");
 assert.equal(readPendingExplorerQuery({area:["assessments"]},items.map(i=>i.kind)).invalid,true);
});

test("civil date filters and year boundaries agree with Sao Paulo calendar",()=>{
 const r=[{...items[0],createdAt:"2027-01-01T01:00:00Z"}];
 assert.deepEqual(pendingQueueYears(r),["2026"]);
 assert.equal(pendingQueueCivilDay(r[0].createdAt),"2026-12-31");
 const q=readPendingExplorerQuery({ano:"2026",mes:"12",dataInicial:"2026-12-31",dataFinal:"2026-12-31"},r.map(x=>x.kind),["2026"]);
 assert.deepEqual(explorePendingClientQueue(r,q).map(x=>x.id),["a"]);
 assert.deepEqual(explorePendingClientQueue(r,{...q,month:"01"}).map(x=>x.id),[]);
});
test("responsibility, chronology, invalid dates and link isolation",()=>{
 const r=[...items,{...items[0],id:"c",createdAt:"invalid",clientId:null}];
 assert.equal(explorePendingClientQueue(r,{query:"",kind:"all",responsible:"client"}).length,0);
 assert.deepEqual(explorePendingClientQueue(r,{query:"",kind:"all",dateValidity:"invalid"}).map(x=>x.id),["c"]);
 assert.deepEqual(explorePendingClientQueue(r,{query:"",kind:"all",clientScope:"system"}).map(x=>x.id),["c"]);
 assert.equal(countPendingQueueClients(r),2);
 assert.equal(pendingQueueOldestDate(r),"2026-10-10T10:00:00.000Z");
 const q=readPendingExplorerQuery({ordem:"newest",mes:"10",responsavel:"patty",paginaCliente:"3"},r.map(x=>x.kind),["2026"]);
 assert.match(pendingExplorerPageHref("patty",q,2),/paginaPatty=2/);
 assert.match(pendingExplorerPageHref("patty",q,2),/paginaCliente=3/);
 assert.match(pendingExplorerPageHref("patty",q,2),/responsavel=patty/);
});
test("repeated-client filtering and independent pages do not mutate source",()=>{
 const r=[items[0],{...items[0],id:"c"},items[1]];
 assert.deepEqual(explorePendingClientQueue(r,{query:"",kind:"all",multiple:"multiple"}).map(x=>x.id),["a","c"]);
 assert.deepEqual(explorePendingClientQueue(r,{query:"",kind:"all",multiple:"single"}).map(x=>x.id),["b"]);
 const long=Array.from({length:32},(_,i)=>({id:String(i)}));
 const page=paginatePendingQueue(long,3);
 assert.equal(page.page,3);assert.equal(page.from,31);assert.equal(page.to,32);
 assert.equal(paginatePendingQueue(long,99).adjusted,true);
 assert.equal(long.length,32);
});
test("untrusted dates, sort modes and page params are normalized",()=>{
 const bad=readPendingExplorerQuery({mes:"13",dataInicial:"2026-02-30",dataFinal:"2026-02-01",ordem:"evil",paginaPatty:"-100",multiplas:["multiple"]},items.map(x=>x.kind));
 assert.equal(bad.invalid,true);assert.equal(bad.sort,"oldest");assert.equal(bad.month,"all");assert.equal(bad.pattyPage,1);
 assert.equal(bad.fromDate,null);assert.equal(bad.multiple,"all");
});

test("client-scoped pending queue validates identifiers and preserves scope in navigation",()=>{
 const id="11111111-1111-4111-8111-111111111111";
 const scoped=[{...items[0],clientId:id},{...items[1],clientId:"22222222-2222-4222-8222-222222222222"}];
 const state=readPendingExplorerQuery({cliente:id},scoped.map(item=>item.kind));
 assert.equal(state.invalid,false);
 assert.equal(state.clientId,id);
 assert.deepEqual(explorePendingClientQueue(scoped,state).map(item=>item.id),["a"]);
 assert.match(pendingExplorerPageHref("patty",state,2),/cliente=11111111-1111-4111-8111-111111111111/);
 const invalid=readPendingExplorerQuery({cliente:"../../other"},scoped.map(item=>item.kind));
 assert.equal(invalid.invalid,true);
 assert.equal(invalid.clientId,null);
});

test("malformed client filter cannot silently expand the authorized queue",()=>{
 const state=readPendingExplorerQuery({cliente:"../../invalid"},items.map(item=>item.kind));
 assert.equal(state.invalidClient,true);
 assert.deepEqual(explorePendingClientQueue(items,state),[]);
 assert.equal(pendingExplorerResetHref(state.clientId),"/admin/pendencias");
 const id="11111111-1111-4111-8111-111111111111";
 assert.equal(pendingExplorerResetHref(id),"/admin/pendencias?cliente="+id);
});

test("default oldest sorting is chronological even when source arrives newest first",()=>{
 const rows=[{...items[0],id:"new",createdAt:"2026-10-14T10:00:00Z"},{...items[0],id:"old",createdAt:"2026-10-10T10:00:00Z"},{...items[0],id:"invalid",createdAt:"invalid"}];
 assert.deepEqual(explorePendingClientQueue(rows,{query:"",kind:"all"}).map(x=>x.id),["old","new","invalid"]);
 assert.deepEqual(explorePendingClientQueue(rows,{query:"",kind:"all",sort:"newest"}).map(x=>x.id),["new","old","invalid"]);
 assert.equal(rows[0].id,"new");
});

test("pending group page numbers show first last and nearby pages without duplicates",()=>{
 assert.deepEqual(visiblePendingQueuePages(1,1),[1]);
 assert.deepEqual(visiblePendingQueuePages(1,10),[1,2,3,10]);
 assert.deepEqual(visiblePendingQueuePages(5,10),[1,3,4,5,6,7,10]);
 assert.deepEqual(visiblePendingQueuePages(10,10),[1,8,9,10]);
 assert.deepEqual(visiblePendingQueuePages(99,10),[1,8,9,10]);
 assert.deepEqual(visiblePendingQueuePages(1,0),[]);
});
