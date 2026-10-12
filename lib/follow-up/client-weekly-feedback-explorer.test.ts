import assert from "node:assert/strict";
import test from "node:test";
import { availableClientFeedbackHistoryYears, readClientFeedbackHistoryQuery, exploreClientFeedbackHistory, clientFeedbackHistoryHref, clientSubmittedFeedbackHref } from "./client-weekly-feedback-explorer.ts";
const rows=Array.from({length:23},(_,i)=>({id:"synthetic-"+i,period_start:(i%2?"2025":"2026")+"-"+(i%3?"09":"10")+"-21",request_source:i%3?"manual":"schedule"}));
test("historical client feedback can be browsed without hiding outstanding response forms",()=>{
 const years=availableClientFeedbackHistoryYears(rows);
 assert.deepEqual(years,["2026","2025"]);
 const filters=readClientFeedbackHistoryQuery({origem:"manual",ano:"2025"},years);
 const out=exploreClientFeedbackHistory(rows,filters);
 assert.ok(out.items.every(x=>x.period_start.startsWith("2025-")&&x.request_source==="manual"));
 assert.equal(rows.length,23);
});
test("submitted history filters month, handles no matches and keeps anchor",()=>{
 const years=["2026","2025"];
 const filter=readClientFeedbackHistoryQuery({origem:"schedule",ano:"2025",mes:"10"},years);
 assert.equal(filter.invalid,false);
 assert.ok(exploreClientFeedbackHistory(rows,filter).items.every(x=>x.period_start.slice(5,7)==="10"));
 assert.equal(exploreClientFeedbackHistory(rows,{...filter,year:"2024"}).total,0);
 assert.equal(clientFeedbackHistoryHref(filter,2),"/cliente/feedback-semanal?origem=schedule&ano=2025&mes=10&pagina=2#historico-enviado");
 assert.equal(readClientFeedbackHistoryQuery({mes:["10"]},years).invalid,true);
 assert.equal(readClientFeedbackHistoryQuery({mes:"13"},years).month,"all");
});
test("exact submitted record returns stable authorized page and anchor",()=>{
 assert.equal(clientSubmittedFeedbackHref(rows,"synthetic-12"),"/cliente/feedback-semanal?pagina=2#feedback-enviado-synthetic-12");
 assert.equal(clientSubmittedFeedbackHref(rows,"other-client"),null);
});
test("backward compatible navigation remains bounded",()=>{
 const invalid=readClientFeedbackHistoryQuery({origem:["manual"],ano:"2024",pagina:"01"},["2026","2025"]);
 assert.deepEqual([invalid.origin,invalid.year,invalid.page,invalid.invalid],["all","all",1,true]);
 const page=exploreClientFeedbackHistory(rows,readClientFeedbackHistoryQuery({pagina:"999"},["2026","2025"]));
 assert.equal(page.page,3);assert.equal(page.items.length,3);
});
