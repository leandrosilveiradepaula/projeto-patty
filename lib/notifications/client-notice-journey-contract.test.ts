import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("notice shortcut shows only factual pending count and preserves filtered view",()=>{
 const page=read("app/cliente/avisos/page.tsx");
 assert.match(page,/notices\.filter\(row => row\.status === "pending"\)\.length/);
 assert.match(page,/outstanding > 0 \?/);
 assert.match(page,/\/cliente\/avisos\?situacao=pending#lista-avisos/);
 assert.match(page,/explored\.first/);
 assert.match(page,/explored\.last/);
 assert.match(page,/clientInAppFeedbackNotices\(events, feedbacks, client\.id\)/);
 assert.doesNotMatch(page,/createAdminClient|service_role/);
});
test("notice journey retains actionable feedback and other client destinations",()=>{
 const page=read("app/cliente/avisos/page.tsx");
 assert.match(page,/clientSubmittedFeedbackHref\(submittedFeedbacks, feedback\.id\)/);
 assert.match(page,/feedback-pendente-\$\{feedback\.id\}/);
 assert.match(page,/ClientJourneyNextSteps areas=\{\["feedback","checkins","index"\]\}/);
});

test("weekly feedback only displays in-app reminders already verified by the client inbox",()=>{
 const page=read("app/cliente/feedback-semanal/page.tsx");
 assert.match(page,/clientInAppFeedbackNotices\(notificationEvents, feedbacks, client\.id\)/);
 assert.match(page,/notice\.status === "pending"/);
 assert.match(page,/notice\.feedback\.id/);
 assert.doesNotMatch(page,/\.map\(\(event\) => event\.weekly_feedback_id\)/);
});
