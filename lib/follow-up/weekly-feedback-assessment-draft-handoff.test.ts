import assert from "node:assert/strict";
import test from "node:test";
import { assessmentDirectoryFromSubmittedFeedbackHref, withSubmittedWeeklyFeedbackAssessmentContext } from "./weekly-feedback-professional-handoff.ts";
import { readFileSync } from "node:fs";

const client="11111111-1111-4111-8111-111111111111";
const feedback="22222222-2222-4222-8222-222222222222";
const read=(path:string)=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");

test("handoff preserves only an opaque valid feedback ID and local fragment",()=>{
 assert.equal(assessmentDirectoryFromSubmittedFeedbackHref(client,feedback),
  "/admin/clientes/"+client+"/avaliacoes?feedbackAtual="+feedback+"#nova-avaliacao");
 assert.equal(withSubmittedWeeklyFeedbackAssessmentContext("/admin/avaliacoes/abc#coleta",feedback),
  "/admin/avaliacoes/abc?feedbackAtual="+feedback+"#coleta");
 assert.equal(withSubmittedWeeklyFeedbackAssessmentContext("/admin/avaliacoes/abc", "invalid"),"/admin/avaliacoes/abc");
 assert.equal(withSubmittedWeeklyFeedbackAssessmentContext("https://outside.invalid/", feedback),"https://outside.invalid/");
 assert.equal(withSubmittedWeeklyFeedbackAssessmentContext("//outside.invalid/",feedback),"//outside.invalid/");
});

test("assessment navigation and action revalidate the submitted receipt; do not trust URL or hidden form",()=>{
 const loader=read("lib/follow-up/received-weekly-feedback-loader.ts");
 const directory=read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
 const action=read("app/admin/clientes/[clienteId]/avaliacoes/actions.ts");
 const detail=read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
 const feedbackPage=read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
 assert.match(loader,/\.eq\("client_id", clientId\)/);
 assert.match(loader,/\.eq\("id", feedbackId\)/);
 assert.match(loader,/\.not\("submitted_at", "is", null\)/);
 assert.doesNotMatch(loader,/\.select\("[^"]*answers/);
 assert.match(directory,/findReceivedWeeklyFeedbackHeaderForClient\(client\.id, rawQuery\.feedbackAtual\)/);
 assert.match(action,/findReceivedWeeklyFeedbackHeaderForClient\(client\.id, formData\.get\("feedbackAtual"\)\)/);
 assert.match(action,/createAccessibleClientAssessment/);
 assert.match(feedbackPage,/assessmentDirectoryFromSubmittedFeedbackHref\(client\.id, feedback\.id\)/);
 assert.match(detail,/readWeeklyFeedbackDecisionReturn/);
 assert.doesNotMatch(action,/service_role|createAdminClient/);
});
