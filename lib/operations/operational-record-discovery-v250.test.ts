import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readAiQueueQuery, exploreAiQueue, aiQueueHref } from "./ai-execution-explorer.ts";
import { authorizedExactRecordPage } from "./exact-record-navigation.ts";
import { buildOperationalPendingItems } from "./pending.ts";
const read=(file:string)=>readFileSync(new URL("../../"+file,import.meta.url),"utf8");
const basic={clarificationReminderIntervalHours:24,anamnesisSubmissions:[],clarificationRequests:[],assessments:[],protocolVersions:[],aiExecutions:[]};
test("oldest authorized training request is located on its exact history page",()=>{
 const ordered=Array.from({length:26},(_,i)=>({id:"request-"+i}));
 assert.equal(authorizedExactRecordPage(ordered,"request-22",10),3);
 assert.equal(authorizedExactRecordPage(ordered,"other-user",10),null);
 const page=read("app/admin/clientes/[clienteId]/treino/page.tsx");
 assert.match(page,/search.pedidoExato/);
 assert.match(page,/requestFilters.origin = "all"/);
 const queue=buildOperationalPendingItems({...basic,trainingLifecycle:[{clientId:"client-1",clientLabel:"X",createdAt:"2026-10-12T12:00:00Z",id:"request-22",state:"requested_without_plan" as const,versionNumber:null}]});
 assert.equal(queue[0]?.href,"/admin/clientes/client-1/treino?pedidoExato=request-22#pedido-treino-request-22");
});
test("AI recovery navigation resolves exact authorized execution and exposes only persisted provider/model",()=>{
 const rows=Array.from({length:27},(_,i)=>({id:"run-"+i,provider:i%2?"openai":"offline",purpose_key:"anamnesis_review",clients:{full_name:"Synthetic"}}));
 assert.equal(authorizedExactRecordPage(rows,"run-24",12),3);
 const query=readAiQueueQuery({provedor:"openai",pagina:"2"},["anamnesis_review"]);
 assert.equal(exploreAiQueue(rows,query).total,13);
 assert.equal(aiQueueHref(query,2),"/admin/ia?provedor=openai&pagina=2");
 const page=read("app/admin/ia/page.tsx");
 assert.match(page,/rawQuery.execucao/);
 assert.match(page,/execution.provider/);
 assert.match(page,/execution.model_identifier/);
 assert.match(page,/id={`execucao-ia-${execution.id}`}/);
});
test("non-Anamnese AI queue item opens the matching recovery entry",()=>{
 const queue=buildOperationalPendingItems({...basic,aiExecutions:[{clientId:"client-x",clientLabel:"X",createdAt:"2026-10-12T12:00:00Z",id:"run-37",purposeKey:"unknown"}]});
 assert.equal(queue[0].href,"/admin/ia?execucao=run-37#execucao-ia-run-37");
});
test("Anamnese draft and submitted empty-filter states remain distinguishable",()=>{
 const page=read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
 assert.match(page,/Nenhum rascunho nesta versão/);
 assert.match(page,/Nenhuma Anamnese enviada nesta versão/);
 assert.match(page,/pendingHistory.total/);
 assert.match(page,/submittedHistory.total/);
 assert.match(page,/selected.pending>pendingHistory.pages/);
});
test("professional feedback filtered empty results direct to existing submissions",()=>{
 const page=read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
 assert.match(page,/Nenhum pendente neste filtro/);
 assert.match(page,/Nenhum envio neste filtro/);
 assert.match(page,/rawPendingCount > 0/);
 assert.match(page,/rawSubmittedCount > 0/);
});
