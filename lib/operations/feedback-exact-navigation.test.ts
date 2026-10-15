import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("client dashboard and in-app inbox deep link opens the exact pending feedback disclosure", () => {
  const page = read("app/cliente/feedback-semanal/page.tsx");
  const disclosure = read("components/client/ClientHistoryDisclosure.tsx");
  assert.match(read("app/cliente/page.tsx"), /feedback-pendente-\$\{firstPendingFeedback.id\}/);
  assert.match(read("app/cliente/avisos/page.tsx"), /feedback-pendente-\$\{feedback.id\}/);
  assert.match(page, /id=\{\x60feedback-pendente-\$\{feedback.id\}\x60\}/);
  assert.match(page, /<ClientHistoryDisclosure/);
  assert.match(page, /defaultOpen=\{feedbackIndex === 0\}/);
  assert.match(disclosure, /window.addEventListener\("hashchange", revealTarget\)/);
  assert.match(disclosure, /details.open = true/);
  assert.match(page, /id=\{\x60feedback-enviado-\$\{feedback.id\}\x60\}/);
});
test("professional pending links resolve to the exact record in the authorized client workspace", () => {
  const queue = read("lib/operations/pending.ts");
  const admin = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(queue, /#feedback-pendente-\$\{feedback.id\}/);
  assert.match(admin, /id=\{\x60feedback-pendente-\$\{feedback.id\}\x60\}/);
  assert.match(admin, /id=\{\x60feedback-enviado-\$\{feedback.id\}\x60\}/);
  assert.match(admin, /orderClientWeeklyFeedbacks\(feedbacks\)/);
  assert.doesNotMatch(admin, /createAdminClient\(/);
});

test("professional exact submitted feedback opens its authorized answer disclosure", () => {
  const admin = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(admin, /open=\{exactSubmittedPage !== null && rawQuery\.registro === feedback\.id\}/);
  assert.match(admin, /authorizedExactRecordPage\(orderedFeedbacks\.filter\(f=>f\.submitted_at!==null\),rawQuery\.registro,10\)/);
});

test("professional exact feedback navigation explains temporary filter reset", () => {
  const admin = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(admin, /exactRecordLocated \? \(/);
  assert.match(admin, /Os filtros de origem e ano foram desconsiderados/);
  assert.match(admin, /Voltar ao histórico completo/);
});


test("client final send is confirmed by its authorized submitted record, not by URL alone", () => {
  const page = read("app/cliente/feedback-semanal/page.tsx");
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  const action = read("app/cliente/feedback-semanal/actions.ts");
  assert.match(page, /authorizedExactRecordPage\(\s*submittedFeedbacks, rawQuery\.registro, CLIENT_FEEDBACK_HISTORY_PAGE_SIZE/);
  assert.match(page, /confirmedFeedback = exactSubmittedPage === null/);
  assert.match(page, /confirmedFeedback \? \(/);
  assert.match(page, /title="Envio confirmado"/);
  assert.match(page, /historyFilters\.page = exactSubmittedPage/);
  assert.match(page, /id=\{\x60feedback-enviado-\$\{feedback\.id\}\x60\}/);
  assert.match(action, /if \(submit\) \{[\s\S]*?redirect\("\/cliente\/feedback-semanal\?registro=" \+ id/);
  assert.ok(action.indexOf("if (!saved)") < action.lastIndexOf("redirect("));
  assert.doesNotMatch(form, /router\.replace\(/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|console\.log/);
});

test("admin links to pending or submitted records use exact authorized anchors", () => {
  const form = read("components/admin/AdminWeeklyFeedbackRequestForm.tsx");
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(form, /#feedback-\$\{state\.feedbackSubmitted \? "enviado" : "pendente"\}-\$\{encodeURIComponent\(state\.feedbackId\)\}/);
  assert.match(page, /inboxReturn \?\? "\/admin\/feedback-semanal"/);
});

test("J2 inbox context survives exact record, comparison and manual assessment return", () => {
  const inbox = read("app/admin/feedback-semanal/page.tsx");
  const detail = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  const compare = read("app/admin/clientes/[clienteId]/feedback-semanal/comparar/page.tsx");
  const assessment = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.match(inbox, /weeklyFeedbackInboxReturnHref\(/);
  assert.match(inbox, /fromInbox\(pendingWeeklyFeedbackExactHref\(feedback\)\)/);
  assert.match(inbox, /fromInbox\(receivedWeeklyFeedbackExactHref\(feedback\)\)/);
  assert.match(detail, /readWeeklyFeedbackInboxReturn\(rawQuery\.caixaRetorno\)/);
  assert.match(detail, /withWeeklyFeedbackInboxReturn\(/);
  assert.match(compare, /readWeeklyFeedbackInboxReturn\(requested\.caixaRetorno\)/);
  assert.match(compare, /withWeeklyFeedbackInboxReturn\(receivedWeeklyFeedbackExactHref\(current\)/);
  assert.match(assessment, /readWeeklyFeedbackInboxReturn\(filters\.caixaRetorno\)/);
  assert.match(assessment, /backToFeedback\(weeklyFeedbackComparisonHref\(/);
  assert.match(assessment, /backToFeedback\(receivedWeeklyFeedbackExactHref\(/);
});

test("J2 inbox to client workspace preserves only validated local return context", () => {
  const inbox = read("app/admin/feedback-semanal/page.tsx");
  const workspace = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.match(inbox, /fromInbox\("\/admin\/clientes\/" \+ feedback\.client_id\)/);
  assert.match(workspace, /readWeeklyFeedbackInboxReturn\(query\.caixaRetorno\)/);
  assert.match(workspace, /inboxReturn \? \(/);
  assert.match(workspace, /href=\{inboxReturn\}/);
});
