import assert from "node:assert/strict";
import test from "node:test";
import { readProfessionalFeedbackHistoryQuery, filterProfessionalFeedbacks, paginateProfessionalFeedbacks, professionalFeedbackHistoryHref } from "./professional-weekly-feedback-explorer.ts";
const records=Array.from({length:25},(_,i)=>({id:String(i),request_source:i%2?"manual":"schedule",submitted_at:i%3?"2026-10-12T00:00:00Z":null}));
test("weekly feedback histories separate pending, submitted, and request origin",()=>{
 const pending=filterProfessionalFeedbacks(records,"manual",false);
 const submitted=filterProfessionalFeedbacks(records,"schedule",true);
 assert.ok(pending.every(x=>x.submitted_at===null && x.request_source==="manual"));
 assert.ok(submitted.every(x=>x.submitted_at!==null && x.request_source==="schedule"));
 assert.equal(records.length,25);
});
test("independent history pages preserve valid filters and reject malformed parameters",()=>{
 const query=readProfessionalFeedbackHistoryQuery({origem:"manual",pendentes:"2",enviados:"3"});
 assert.equal(query.invalid,false);
 assert.equal(professionalFeedbackHistoryHref("synthetic",query,"submitted"),"/admin/clientes/synthetic/feedback-semanal?origem=manual&pendentes=2&enviados=3#feedback-enviados");
 const bad=readProfessionalFeedbackHistoryQuery({origem:["manual"],pendentes:"02",enviados:"9999999"});
 assert.equal(bad.invalid,true);
 assert.deepEqual([bad.origin,bad.pendingPage,bad.submittedPage],["all",1,1]);
});
test("weekly feedback pagination clamps without hiding or deleting historical records",()=>{
 const second=paginateProfessionalFeedbacks(records,3);
 assert.deepEqual([second.page,second.pageCount,second.first,second.last,second.items.length],[3,3,21,25,5]);
 assert.equal(records.length,25);
});
