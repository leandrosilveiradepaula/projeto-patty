import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readClientFeedbackHistoryQuery, clientSubmittedFeedbackHref } from "../follow-up/client-weekly-feedback-explorer.ts";
import { readClientNoticeQuery, clientNoticesHref } from "../notifications/client-in-app-inbox-explorer.ts";
import { formatPendingQueueDateTime } from "./pending-date.ts";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("ten related follow-up improvements preserve existing paths and scoped authorization",()=>{
 const home=read("app/cliente/page.tsx");
 const admin=read("app/admin/page.tsx");
 const feedback=read("app/cliente/feedback-semanal/page.tsx");
 const notices=read("app/cliente/avisos/page.tsx");
 assert.match(feedback,/name="mes"/);
 assert.match(feedback,/Nenhuma resposta encontrada/);
 assert.match(notices,/clientSubmittedFeedbackHref\(submittedFeedbacks, feedback.id\)/);
 assert.match(notices,/name="ano"/);
 assert.match(home,/pendingFeedbackDeadline/);
 assert.match(home,/Ver avisos entregues/);
 assert.match(admin,/formatPendingQueueDateTime/);
 assert.match(home,/otherPendingFeedbacks\.map/);
 assert.match(admin,/nextOperationalItems\.map/);
 assert.match(admin,/groupedPendingItems\.operational\.slice\(0, 3\)/);
 assert.doesNotMatch(admin,/private_file_pending_release/);
 assert.match(admin,/Não há ações da Patty registradas/);
 assert.doesNotMatch(home,/service_role|createAdminClient/);
 assert.doesNotMatch(notices,/createAdminClient|service_role/);
});
test("malformed legacy admin time does not interrupt operational panel",()=>{
 assert.equal(formatPendingQueueDateTime("broken"),"Data indisponível");
});
test("exact answer and deep links keep authorization bounded to loaded rows",()=>{
 const rows=[{id:"known"}];
 assert.equal(clientSubmittedFeedbackHref(rows,"known"),"/cliente/feedback-semanal#feedback-enviado-known");
 assert.equal(clientSubmittedFeedbackHref(rows,"different-client"),null);
 assert.equal(clientNoticesHref("responded",2,"2026"),"/cliente/avisos?situacao=responded&ano=2026&pagina=2");
 assert.equal(readClientNoticeQuery({ano:"2023"},["2026"]).invalid,true);
 assert.equal(readClientFeedbackHistoryQuery({mes:"14"},["2026"]).invalid,true);
});
