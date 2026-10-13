import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { authorizedExactRecordPage } from "../operations/exact-record-navigation.ts";
import { readCheckinExploreOptions, exploreLiquidCheckins } from "./history-explorer.ts";
const load=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("corrected check-in links resolve by authorized sorted order rather than original insertion order",()=>{
 const events=Array.from({length:29},(_,i)=>({id:"synthetic-"+i,recorded_at:new Date(Date.UTC(2026,9,1,i)).toISOString(),effectiveAmountMl:i+1,effectiveLiquidKind:"water",wasCorrected:false}));
 const order=exploreLiquidCheckins(events,readCheckinExploreOptions({}));
 const page=authorizedExactRecordPage(order.orderedIds.map(id=>({id})),"synthetic-0",12);
 assert.equal(page,3);
 assert.equal(authorizedExactRecordPage(order.orderedIds.map(id=>({id})),"other-client",12),null);
 assert.equal(events.length,29);
});
test("both professional and client correction flows retain their authorized record anchors",()=>{
 for(const area of ["app/admin/clientes/[clienteId]/checkins","app/cliente/checkins"]){
  const actions=load(area+"/actions.ts"),page=load(area+"/page.tsx");
  assert.match(actions,/liquidoExato/);
  assert.match(actions,/atividadeExata/);
  assert.match(page,/query.liquidoExato/);
  assert.match(page,/query.atividadeExata/);
  assert.match(page,/orderedIds/);
  assert.doesNotMatch(page,/service_role|createAdminClient/);
 }
});
