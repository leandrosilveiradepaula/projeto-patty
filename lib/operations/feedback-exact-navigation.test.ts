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
