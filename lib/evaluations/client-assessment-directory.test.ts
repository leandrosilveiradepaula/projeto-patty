import assert from "node:assert/strict";
import test from "node:test";
import { readClientAssessmentDirectory, clientAssessmentDirectoryFilters, clientAssessmentDirectoryHref } from "./client-assessment-directory.ts";
import { exploreAdminAssessmentDirectory, paginateAdminAssessments } from "./admin-assessment-explorer.ts";
const kinds=["monthly","fortnightly"],months=["2026-10","2026-09"];
test("two independent assessment pages preserve the other page and filters",()=>{
 const filters={kind:"monthly",month:"2026-10",order:"oldest" as const};
 assert.equal(clientAssessmentDirectoryHref("client-synthetic",filters,2,3,"draft"),"/admin/clientes/client-synthetic/avaliacoes?tipo=monthly&mes=2026-10&ordem=oldest&rascunhos=2&historico=3#avaliacoes-em-andamento");
 assert.equal(clientAssessmentDirectoryHref("client-synthetic",filters,2,3,"history").endsWith("#historico-finalizado"),true);
});
test("unknown, repeated and malformed filters are rejected without authorizing additional records",()=>{
 const parsed=readClientAssessmentDirectory({tipo:["monthly"],mes:"2027-01",ordem:"wrong",rascunhos:"02",historico:"9999999"},kinds,months);
 assert.equal(parsed.invalid,true);
 assert.deepEqual(parsed.filters,{kind:"all",month:"all",order:"newest"});
 assert.deepEqual([parsed.draftPage,parsed.historyPage],[1,1]);
 const valid=readClientAssessmentDirectory({tipo:"monthly",mes:"2026-10",ordem:"oldest",rascunhos:"2",historico:"3"},kinds,months);
 assert.equal(valid.invalid,false);
 assert.equal(valid.historyPage,3);
});
test("drafts and finalized assessments stay isolated while paginating",()=>{
 const rows=Array.from({length:37},(_,i)=>({
  id:String(i).padStart(3,"0"),clientId:"synthetic",clientName:"Teste",legacyClientName:null,kind:"monthly",
  assessedAt:`2026-10-${String(i%28+1).padStart(2,"0")}T12:00:00Z`,finalizedAt:i%2===0?"2026-10-30T12:00:00Z":null
 }));
 const filters={kind:"monthly",month:"2026-10",order:"newest" as const};
 const drafts=exploreAdminAssessmentDirectory(rows,clientAssessmentDirectoryFilters(filters,"draft"),kinds);
 const final=exploreAdminAssessmentDirectory(rows,clientAssessmentDirectoryFilters(filters,"finalized"),kinds);
 assert.equal(drafts.length,18);
 assert.equal(final.length,19);
 assert.ok(drafts.every(a=>a.finalizedAt===null));
 assert.ok(final.every(a=>a.finalizedAt!==null));
 assert.equal(paginateAdminAssessments(final,2).items.length,4);
});
