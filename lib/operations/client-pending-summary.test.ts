import assert from "node:assert/strict";
import test from "node:test";
import { summarizeClientPendingItems } from "./client-pending-summary.ts";
import type { OperationalPendingItem } from "./pending.ts";

const base:OperationalPendingItem={id:"a",clientId:"client-1",clientLabel:"Teste",createdAt:"2026-10-14T10:00:00Z",description:"",href:"/admin/test",kind:"assessment_draft",statusLabel:"Rascunho",title:"Avaliação"};

test("directory summary counts all pending groups without mixing clients",()=>{
 const items=[base,{...base,id:"b",kind:"anamnesis_draft" as const},{...base,id:"c",kind:"ai_execution_started" as const},{...base,id:"d",clientId:"client-2"},{...base,id:"e",clientId:null}];
 const result=summarizeClientPendingItems(items);
 assert.deepEqual({total:result.get("client-1")?.total,patty:result.get("client-1")?.patty.length,waiting:result.get("client-1")?.waiting,operational:result.get("client-1")?.operational},{total:3,patty:1,waiting:1,operational:1});
 assert.equal(result.get("client-2")?.total,1);
 assert.equal(result.has(""),false);
 assert.equal(result.size,2);
});

test("first Patty action is oldest even if upstream rows are newest first",()=>{
 const result=summarizeClientPendingItems([{...base,id:"new"},{...base,id:"old",createdAt:"2026-10-10T10:00:00Z"},{...base,id:"invalid",createdAt:"invalid"}]);
 assert.deepEqual(result.get("client-1")?.patty.map(x=>x.id),["old","new","invalid"]);
});
