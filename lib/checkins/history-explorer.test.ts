import assert from "node:assert/strict";
import test from "node:test";
import {readCheckinExploreOptions,exploreLiquidCheckins,exploreActivityCheckins,checkinExploreHref} from "./history-explorer.ts";
test("validates untrusted search fields and bounds page numbers",()=>{
 const q=readCheckinExploreOptions({ordem:"invalid",correcao:"corrected",tipo:"foo bar",lp:"-1",ap:"99999",atividade:"no"});
 assert.equal(q.liquidSort,"newest");assert.equal(q.liquidCorrection,"corrected");assert.equal(q.liquidKind,"all");
 assert.equal(q.liquidPage,1);assert.equal(q.activityPage,1);assert.equal(q.activityFilter,"no");
});
test("filters effective liquids, sorts amounts and paginates without losing events",()=>{
 const events=Array.from({length:30},(_,i)=>({id:String(i),recorded_at:"2026-10-11T10:00:00Z",effectiveAmountMl:i+1,effectiveLiquidKind:i%2?"water":"tea",wasCorrected:i%3===0}));
 const o={...readCheckinExploreOptions({ordem:"amount-desc",tipo:"water",lp:"2"})};
 const result=exploreLiquidCheckins(events,o);
 assert.equal(result.total,15);assert.equal(result.pages,2);assert.deepEqual(result.items.map(x=>x.effectiveAmountMl),[5,3,1]);
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