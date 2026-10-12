import assert from "node:assert/strict";
import test from "node:test";
import { availableAdminAssessmentMonths, assessmentMonthInSaoPaulo, exploreAdminAssessmentDirectory, paginateAdminAssessments, visibleAdminAssessmentPages } from "./admin-assessment-explorer.ts";
import { adminAssessmentDirectoryHref, readAdminAssessmentQuery } from "./admin-assessment-explorer-query.ts";

const rows = [
  {id:"1",clientId:"a",clientName:"Érica Costa",legacyClientName:"Erica",assessedAt:"2026-10-01T02:00:00Z",finalizedAt:null,kind:"fortnightly"},
  {id:"2",clientId:"b",clientName:"Ana",legacyClientName:null,assessedAt:"2026-09-30T21:00:00Z",finalizedAt:"2026-09-30T22:00:00Z",kind:"monthly"},
  {id:"3",clientId:"c",clientName:"Bia",legacyClientName:"Bibi",assessedAt:"invalid-date",finalizedAt:"2026-09-30T22:00:00Z",kind:null},
];
const defaults = {query:"",status:"all" as const,kind:"all",month:"all",order:"newest" as const};
const kinds = ["fortnightly","monthly"];

test("assessment filters are composable without modifying source or fetching unscoped data",()=>{
  assert.deepEqual(exploreAdminAssessmentDirectory(rows,{...defaults,status:"draft"},kinds).map(x=>x.id),["1"]);
  assert.deepEqual(exploreAdminAssessmentDirectory(rows,{...defaults,query:"erica"},kinds).map(x=>x.id),["1"]);
  assert.deepEqual(exploreAdminAssessmentDirectory(rows,{...defaults,query:"BIBI",kind:"legacy"},kinds).map(x=>x.id),["3"]);
  assert.deepEqual(exploreAdminAssessmentDirectory(rows,{...defaults,kind:"monthly",status:"finalized"},kinds).map(x=>x.id),["2"]);
  assert.deepEqual(exploreAdminAssessmentDirectory(rows,{...defaults,month:"invalid"},kinds).map(x=>x.id),["3"]);
  assert.deepEqual(exploreAdminAssessmentDirectory(rows,{...defaults,month:"2026-09"},kinds).map(x=>x.id),["1","2"]);
  assert.equal(rows[0].id,"1");
});

test("dates use Sao Paulo assessment month, not server UTC",()=>{
 assert.equal(assessmentMonthInSaoPaulo(rows[0].assessedAt),"2026-09");
 assert.equal(assessmentMonthInSaoPaulo("garbage"),null);
 assert.deepEqual(availableAdminAssessmentMonths(rows),{months:["2026-09"],hasInvalidDate:true});
});

test("filters parse repeatable and malicious query parameters safely",()=>{
 const parsed=readAdminAssessmentQuery({q:["x","y"],pagina:"03",situacao:"__proto__",tipo:"draft",mes:"2026-99",ordem:"client"},kinds,["2026-09"]);
 assert.equal(parsed.invalid,true);
 assert.deepEqual(parsed.filters,{...defaults,order:"client"});
 assert.equal(parsed.page,1);
 const valid=readAdminAssessmentQuery({q:"Ana",situacao:"finalized",tipo:"monthly",mes:"2026-09",ordem:"oldest",pagina:"2"},kinds,["2026-09"]);
 assert.equal(valid.invalid,false);
 assert.equal(valid.page,2);
 assert.equal(adminAssessmentDirectoryHref(valid.filters,2),"/admin/avaliacoes?q=Ana&situacao=finalized&tipo=monthly&mes=2026-09&ordem=oldest&pagina=2");
});

test("pagination clamps results and keeps endpoints navigable",()=>{
 const items=Array.from({length:36},(_,id)=>id);
 const end=paginateAdminAssessments(items,999);
 assert.deepEqual([end.page,end.pageCount,end.first,end.last,end.total],[3,3,31,36,36]);
 assert.deepEqual(end.items,[30,31,32,33,34,35]);
 assert.deepEqual(visibleAdminAssessmentPages(3,30),[1,2,3,4,30]);
});
