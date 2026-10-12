import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { authorizedExactRecordPage } from "./exact-record-navigation.ts";
import { readAiQueueQuery, exploreAiQueue, aiQueueHref } from "./ai-execution-explorer.ts";
import { readAdminAnamnesisQuery, filterAdminAnamneses, pageAdminAnamneses, adminAnamnesisHref } from "../anamnesis/admin-client-anamnesis-explorer.ts";
import { readAssessmentExplorer, exploreAssessmentMeasures, assessmentExplorerHref } from "../evaluations/client-assessment-explorer.ts";
import { professionalFeedbackYears, readProfessionalFeedbackHistoryQuery, filterProfessionalFeedbacks, professionalFeedbackHistoryHref } from "../follow-up/professional-weekly-feedback-explorer.ts";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("exact historical targets never resolve outside the authorized result",()=>{
 const rows=Array.from({length:26},(_,i)=>({id:"f"+i}));
 assert.equal(authorizedExactRecordPage(rows,"f24",12),3);
 assert.equal(authorizedExactRecordPage(rows,"other-client",12),null);
 for(const invalid of [null,["f0"],"",42])assert.equal(authorizedExactRecordPage(rows,invalid,12),null);
 assert.equal(rows.length,26);
});

test("historical operational links preserve exact page while still using scoped reads",()=>{
 const queue=read("lib/operations/pending.ts");
 const professional=read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
 const files=read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
 const releases=read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
 const evolution=read("app/cliente/evolucao/page.tsx");
 const clientAssessments=read("app/cliente/avaliacoes/page.tsx");
 assert.match(queue,/feedback-semanal\?registro=\$\{feedback.id\}/);
 assert.match(queue,/arquivos\?arquivoPendente=\$\{file.fileId\}/);
 assert.match(queue,/conteudos\?liberacao=\$\{release.releaseId\}/);
 assert.match(professional,/authorizedExactRecordPage/);
 assert.match(files,/authorizedExactRecordPage/);
 assert.match(releases,/authorizedExactRecordPage/);
 assert.match(evolution,/avaliacoes\?avaliacao=\$\{point.assessmentId\}/);
 assert.match(clientAssessments,/authorizedExactRecordPage\(items,raw.avaliacao,12\)/);
 for(const page of [professional,files,releases,clientAssessments])assert.doesNotMatch(page,/service_role|createAdminClient/);
});

test("professional weekly feedback year filter does not alter original entries",()=>{
 const rows=[{id:"1",request_source:"manual",submitted_at:null,period_start:"2025-10-12"},{id:"2",request_source:"schedule",submitted_at:"2026-10-12",period_start:"2026-10-12"}];
 const years=professionalFeedbackYears(rows);
 assert.deepEqual(years,["2026","2025"]);
 const filter=readProfessionalFeedbackHistoryQuery({ano:"2025"},years);
 assert.equal(filter.year,"2025");
 assert.deepEqual(filterProfessionalFeedbacks(rows,"all",false,filter.year).map(x=>x.id),["1"]);
 assert.equal(professionalFeedbackHistoryHref("synthetic",{...filter,pendingPage:1,submittedPage:2},"submitted"),"/admin/clientes/synthetic/feedback-semanal?ano=2025&enviados=2#feedback-enviados");
 assert.equal(readProfessionalFeedbackHistoryQuery({ano:["2025"]},years).invalid,true);
});

test("AI queue can be searched and paged without any new execution action",()=>{
 const rows=Array.from({length:30},(_,i)=>({purpose_key:"anamnesis_review",clients:{full_name:i%2?"Ágata":"Bia"},id:"synthetic-"+i}));
 const q=readAiQueueQuery({q:"agata",pagina:"2"},["anamnesis_review"]);
 const result=exploreAiQueue(rows,q);
 assert.deepEqual([result.total,result.page,result.pages,result.items.length],[15,2,2,3]);
 assert.equal(aiQueueHref(q,2),"/admin/ia?q=agata&pagina=2");
 assert.equal(readAiQueueQuery({tipo:"untrusted",pagina:["1"]},["anamnesis_review"]).invalid,true);
 const page=read("app/admin/ia/page.tsx");
 assert.match(page,/Ver contexto da cliente/);
 assert.match(page,/Data indisponível/);
});

test("Anamnese version pages remain separate and never modify submissions",()=>{
 const rows=Array.from({length:25},(_,i)=>({id:"a"+i,anamnesis_form_versions:{version_number:i%2?2:1}}));
 const q=readAdminAnamnesisQuery({versao:"2",enviadas:"2",pendentes:"1"},[1,2]);
 const filtered=filterAdminAnamneses(rows,q.version);
 const page=pageAdminAnamneses(filtered,q.submitted);
 assert.equal(filtered.length,12);
 assert.equal(page.items.length,0===page.page-1?12:0);
 assert.equal(adminAnamnesisHref("synthetic","2",1,2,"submitted"),"/admin/clientes/synthetic/anamnese?versao=2&enviadas=2#anamnese-submitted");
 assert.equal(readAdminAnamnesisQuery({versao:["2"]},[2]).invalid,true);
 assert.equal(rows.length,25);
});

test("client assessment history separates zero measures and retains page boundaries",()=>{
 const rows=Array.from({length:26},(_,i)=>({id:"a"+i,measurements:i%2?[]:[{value:i}]}));
 const q=readAssessmentExplorer({medidas:"without",pagina:"2"});
 const out=exploreAssessmentMeasures(rows,q);
 assert.equal(out.total,13);
 assert.equal(out.items.length,1);
 assert.equal(out.items[0].id,"a25");
 assert.equal(assessmentExplorerHref("without",2),"/cliente/avaliacoes?medidas=without&pagina=2#historico-avaliacoes");
 assert.equal(readAssessmentExplorer({medidas:["without"]}).invalid,true);
});
