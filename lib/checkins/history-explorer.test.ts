import assert from "node:assert/strict";
import test from "node:test";
import {readCheckinExploreOptions,exploreLiquidCheckins,exploreActivityCheckins,checkinExploreHref,checkinCorrectionReturnQuery,readCheckinCorrectionReturnQuery,resolveCheckinExactTarget,availableCheckinHistoryYears,liquidHistoryCalendarDate} from "./history-explorer.ts";
test("validates untrusted search fields and bounds page numbers",()=>{
 const q=readCheckinExploreOptions({ordem:"invalid",correcao:"corrected",tipo:"foo bar",lp:"-1",ap:"999999",atividade:"no"});
 assert.equal(q.liquidSort,"newest");assert.equal(q.liquidCorrection,"corrected");assert.equal(q.liquidKind,"all");
 assert.equal(q.liquidPage,1);assert.equal(q.activityPage,1);assert.equal(q.activityFilter,"no");
});
test("filters effective liquids, sorts amounts and paginates without losing events",()=>{
 const events=Array.from({length:30},(_,i)=>({id:String(i),recorded_at:"2026-10-11T10:00:00Z",effectiveAmountMl:i+1,effectiveLiquidKind:i%2?"water":"tea",wasCorrected:i%3===0}));
 const o={...readCheckinExploreOptions({ordem:"amount-desc",tipo:"water",lp:"2"})};
 const result=exploreLiquidCheckins(events,o);
 assert.equal(result.total,15);assert.equal(result.pages,2);assert.deepEqual(result.items.map(x=>x.effectiveAmountMl),[6,4,2]);
});
test("correction filter and out of range pages are safe",()=>{
 const events=[{id:"1",recorded_at:"2026",didActivityEffective:true,wasCorrected:true},{id:"2",recorded_at:"2026",didActivityEffective:false,wasCorrected:false}];
 const o=readCheckinExploreOptions({atividade:"yes",atividadeCorrecao:"corrected",ap:"9999"});
 assert.deepEqual(exploreActivityCheckins(events,o).items.map(x=>x.id),["1"]);
 assert.equal(exploreActivityCheckins(events,o).page,1);
});
test("links retain safe selected filters without patient identifiers",()=>{
 assert.equal(checkinExploreHref("/cliente/checkins",{dia:"2026-10-11",correcao:"corrected",lp:"2"},{lp:"3"}),"/cliente/checkins?dia=2026-10-11&correcao=corrected&lp=3");
});
test("preserves numeric liquid kind 1 without exposing default pagination",()=>{
 assert.equal(checkinExploreHref("/cliente/checkins",{tipo:"1",lp:"1",ap:"2"},{}),"/cliente/checkins?tipo=1&ap=2");
});

test("corrected history retains sorted page when target still matches current filters",()=>{
 const records=Array.from({length:28},(_,i)=>({id:String(i),recorded_at:new Date(2026,0,1,i).toISOString(),effectiveAmountMl:i+1,effectiveLiquidKind:"water",wasCorrected:i%2===0}));
 const o=readCheckinExploreOptions({ordem:"oldest",correcao:"corrected",atividade:"yes",ap:"3"});
 const resolved=resolveCheckinExactTarget(records,"26",o,"liquid",(rows,opts)=>exploreLiquidCheckins(rows,opts));
 assert.equal(resolved.liquidPage,2);
 assert.equal(resolved.liquidCorrection,"corrected");
 assert.equal(resolved.liquidSort,"oldest");
 assert.equal(resolved.activityFilter,"yes");assert.equal(resolved.activityPage,3);
});
test("only incompatible liquid filters relax; leave activity state and sorting untouched",()=>{
 const records=[{id:"a",recorded_at:"2026-10-10T12:00:00Z",effectiveAmountMl:150,effectiveLiquidKind:"tea",wasCorrected:true}];
 const o=readCheckinExploreOptions({tipo:"water",ordem:"amount-asc",correcao:"original",origemLiquido:"client",atividade:"no",atividadeCorrecao:"corrected",ap:"4"});
 const resolved=resolveCheckinExactTarget(records,"a",o,"liquid",(rows,opts)=>exploreLiquidCheckins(rows,opts));
 assert.equal(resolved.liquidKind,"all");assert.equal(resolved.liquidCorrection,"all");
 assert.equal(resolved.liquidOrigin,"all");assert.equal(resolved.liquidSort,"amount-asc");
 assert.equal(resolved.activityFilter,"no");assert.equal(resolved.activityCorrection,"corrected");assert.equal(resolved.activityPage,4);
});
test("activity correction resolves within its filters then relaxes only activity filters",()=>{
 const records=[{id:"a",recorded_at:"2026-10-10T12:00:00Z",checkin_date:"2026-10-10",didActivityEffective:true,wasCorrected:true}];
 const o=readCheckinExploreOptions({atividade:"no",ordemAtividade:"oldest",tipo:"water",lp:"3"});
 const resolved=resolveCheckinExactTarget(records,"a",o,"activity",(rows,opts)=>exploreActivityCheckins(rows,opts));
 assert.equal(resolved.activityFilter,"all");assert.equal(resolved.activitySort,"oldest");
 assert.equal(resolved.liquidKind,"water");assert.equal(resolved.liquidPage,3);
});
test("foreign, malformed and unknown exact IDs never change explorer state",()=>{
 const records=[{id:"a",recorded_at:"2026-10-10T12:00:00Z",effectiveAmountMl:150,effectiveLiquidKind:"tea",wasCorrected:false}];
 const o=readCheckinExploreOptions({tipo:"water",lp:"2",atividade:"yes",ap:"5"});
 for(const id of ["other-client",null,"x".repeat(129)]){
  assert.deepEqual(resolveCheckinExactTarget(records,id,o,"liquid",(rows,opts)=>exploreLiquidCheckins(rows,opts)),o);
 }
});
test("correction form return context rejects injected client IDs, statuses, dates and URLs",()=>{
 const o=readCheckinExploreOptions({tipo:"1",ordem:"oldest",lp:"4",ap:"3",atividade:"no"});
 const state=checkinCorrectionReturnQuery(o);
 const safe=readCheckinCorrectionReturnQuery(state+"&status=success&dia=2025-01-01&clientId=someone&dest=https://evil.example/");
 const values=new URLSearchParams(safe);
 assert.equal(values.get("tipo"),"1");assert.equal(values.get("lp"),"4");assert.equal(values.get("ap"),"3");
 for(const key of ["status","dia","clientId","dest"])assert.equal(values.has(key),false);
 assert.equal(readCheckinCorrectionReturnQuery("x".repeat(513)),"");
 assert.equal(readCheckinCorrectionReturnQuery(null),"");
});

test("factual period, amount and repeat filters never infer clinical targets",()=>{
 const liquids=[
  {id:"a",recorded_at:"2026-10-10T01:00:00Z",effectiveAmountMl:150,effectiveLiquidKind:"water",wasCorrected:false},
  {id:"b",recorded_at:"2026-10-10T14:00:00Z",effectiveAmountMl:650,effectiveLiquidKind:"water",wasCorrected:true},
  {id:"c",recorded_at:"2025-10-10T14:00:00Z",effectiveAmountMl:650,effectiveLiquidKind:"water",wasCorrected:false}
 ];
 assert.equal(liquidHistoryCalendarDate(liquids[0].recorded_at),"2026-10-09");
 assert.deepEqual(availableCheckinHistoryYears(liquids.map(l=>liquidHistoryCalendarDate(l.recorded_at))),["2026","2025"]);
 const options=readCheckinExploreOptions({anoLiquido:"2026",mesLiquido:"10",minMl:"200",maxMl:"700"});
 assert.deepEqual(exploreLiquidCheckins(liquids,options).items.map(l=>l.id),["b"]);
 const events=[{id:"a",recorded_at:"2026-10-10T10:00:00Z",checkin_date:"2026-10-10",didActivityEffective:true,wasCorrected:false},
 {id:"b",recorded_at:"2026-10-10T11:00:00Z",checkin_date:"2026-10-10",didActivityEffective:false,wasCorrected:false},
 {id:"c",recorded_at:"2026-10-11T10:00:00Z",checkin_date:"2026-10-11",didActivityEffective:true,wasCorrected:false}];
 assert.deepEqual(exploreActivityCheckins(events,readCheckinExploreOptions({repeticaoAtividade:"multiple"})).items.map(e=>e.id),["b","a"]);
 assert.deepEqual(exploreActivityCheckins(events,readCheckinExploreOptions({repeticaoAtividade:"single"})).items.map(e=>e.id),["c"]);
});
test("correction recency sorts actual correction time, with unchanged records last",()=>{
 const arr=[{id:"a",recorded_at:"2026-10-11T10:00:00Z",effectiveAmountMl:10,effectiveLiquidKind:"water",wasCorrected:false},
 {id:"b",recorded_at:"2026-10-09T10:00:00Z",effectiveAmountMl:10,effectiveLiquidKind:"water",wasCorrected:true,lastCorrectedAt:"2026-10-12T10:00:00Z"},
 {id:"c",recorded_at:"2026-10-10T10:00:00Z",effectiveAmountMl:10,effectiveLiquidKind:"water",wasCorrected:true,lastCorrectedAt:"2026-10-13T10:00:00Z"}];
 assert.deepEqual(exploreLiquidCheckins(arr,readCheckinExploreOptions({ordem:"recent-correction"})).items.map(x=>x.id),["c","b","a"]);
});
test("invalid year month and quantity bounds fail to permitted defaults",()=>{
 const o=readCheckinExploreOptions({anoLiquido:"2026x",mesAtividade:"22",minMl:"-1",maxMl:"99999999999999",repeticaoAtividade:"random"});
 assert.equal(o.liquidYear,"all"); assert.equal(o.activityMonth,"all");assert.equal(o.minimumMl,null);
 assert.equal(o.maximumMl,null);assert.equal(o.activityRepeated,"all");
 const r=readCheckinExploreOptions({minMl:"700",maxMl:"200"});
 assert.equal(r.minimumMl,null);assert.equal(r.maximumMl,null);
});
