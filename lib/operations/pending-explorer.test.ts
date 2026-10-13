import assert from "node:assert/strict";
import test from "node:test";
import { readPendingExplorerQuery, explorePendingClientQueue, pendingExplorerGroupHref, pendingExplorerPageHref,paginatePendingQueue,pendingQueueYears,pendingQueueCivilDay,countPendingQueueClients,pendingQueueOldestDate } from "./pending-explorer.ts";
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
