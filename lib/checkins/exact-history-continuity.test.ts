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
  assert.match(page,/resolveCheckinExactTarget/);
  assert.doesNotMatch(page,/service_role|createAdminClient/);
 }
});

test("client always renders the paged activity history, including today, for exact correction anchors",()=>{
  const page=load("app/cliente/checkins/page.tsx");
  assert.match(page,/title=\{selectedDay === today \? "Histórico de atividade física de hoje"/);
  assert.doesNotMatch(page,/\{selectedDay !== today \? \(\s*<Section\s+description="Respostas factuais do dia escolhido/);
  assert.match(page,/id=\{\x60atividade-\$\{event.id\}\x60\}/);
  assert.match(page,/resolveCheckinExactTarget\(effectiveActivityEvents/);
  assert.match(page,/exploredActivities\.items\.map/);
});

test("both workspaces retain filter state, pages and allowlist correction returns",()=>{
 for(const area of ["app/cliente/checkins","app/admin/clientes/[clienteId]/checkins"]){
  const page=load(area+"/page.tsx"),actions=load(area+"/actions.ts");
  assert.match(page,/name="returnExplorer"/);
  assert.match(page,/checkinCorrectionReturnQuery/);
  assert.match(page,/name="ap" value=\{exploredActivities.page\}/);
  assert.match(page,/name="lp" value=\{exploredLiquids.page\}/);
  assert.match(page,/resolveCheckinExactTarget/);
  assert.match(actions,/readCheckinCorrectionReturnQuery\(formData.get\("returnExplorer"\)\)/);
 }
});
