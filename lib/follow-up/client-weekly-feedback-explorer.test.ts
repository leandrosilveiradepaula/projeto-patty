import assert from "node:assert/strict";
import test from "node:test";
import { availableClientFeedbackHistoryYears, readClientFeedbackHistoryQuery, exploreClientFeedbackHistory, clientFeedbackHistoryHref } from "./client-weekly-feedback-explorer.ts";
const rows=Array.from({length:23},(_,i)=>({id:String(i),period_start:(i%2?"2025":"2026")+"-09-21",request_source:i%3?"manual":"schedule"}));
test("historical client feedback can be browsed without hiding outstanding response forms",()=>{
 const years=availableClientFeedbackHistoryYears(rows);
 assert.deepEqual(years,["2026","2025"]);
 const filters=readClientFeedbackHistoryQuery({origem:"manual",ano:"2025"},years);
 const out=exploreClientFeedbackHistory(rows,filters);
 assert.ok(out.items.every(x=>x.period_start.startsWith("2025-")&&x.request_source==="manual"));
 assert.equal(rows.length,23);
});
test("submitted history page links are bounded and preserve only vetted filters",()=>{
 const years=["2026","2025"];
 const ok=readClientFeedbackHistoryQuery({origem:"manual",ano:"2025",pagina:"2"},years);
 assert.equal(ok.invalid,false);
 assert.equal(clientFeedbackHistoryHref(ok,2),"/cliente/feedback-semanal?origem=manual&ano=2025&pagina=2#historico-enviado");
 const invalid=readClientFeedbackHistoryQuery({origem:["manual"],ano:"2024",pagina:"01"},years);
 assert.equal(invalid.invalid,true);
 assert.deepEqual([invalid.origin,invalid.year,invalid.page],["all","all",1]);
 const page=exploreClientFeedbackHistory(rows,readClientFeedbackHistoryQuery({pagina:"999"},years));
 assert.equal(page.page,3);
 assert.equal(page.items.length,3);
});
