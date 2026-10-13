import assert from "node:assert/strict";
import test from "node:test";
import { readPendingExplorerQuery, explorePendingClientQueue, pendingExplorerGroupHref } from "./pending-explorer.ts";
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
