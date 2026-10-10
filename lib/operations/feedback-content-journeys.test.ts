import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("manual weekly feedback checks dates and refreshes only after a confirmed request", () => {
  const source = read("components/admin/AdminWeeklyFeedbackRequestForm.tsx");
  assert.match(source, /periodEnd < periodStart/);
  assert.match(source, /min=\{periodStart \|\| undefined\}/);
  assert.match(source, /disabled=\{!eligible \|\| periodReversed \|\| isPending\}/);
  assert.match(source, /if \(state\.success\)/);
  assert.match(source, /router\.refresh\(\)/);
});

test("professional reminder uses persisted latest event, not first incidental item", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(page, /latestReminderEventByFeedback\(notificationEvents\)/);
  assert.match(page, /describeAdminFeedbackReminder\(reminderEvent\)/);
});

test("client weekly feedback has a non-submitting draft and text-limit guidance", () => {
  const source = read("app/cliente/feedback-semanal/page.tsx");
  assert.match(source, /Salvar rascunho não envia suas respostas/);
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.match(form, /maxLength=\{4000\}/);
  const controls = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackSubmitControls.tsx");
  assert.match(source, /<ClientWeeklyFeedbackResponseForm/);
  assert.match(form, /<ClientWeeklyFeedbackSubmitControls completed=\{submitted\} \/>/);
  assert.match(controls, /name="intent" type="submit" value="save"/);
  assert.match(controls, /name="intent" type="submit" value="submit"/);
});

test("content release requires selected exact version and explicit professional confirmation", () => {
  const source = read("components/admin/ClientContentReleaseForm.tsx");
  assert.match(source, /setConfirmRelease\(true\)/);
  assert.match(source, /Confirmar liberação/);
  assert.match(source, /disabled=\{!selectedVersion \|\| isPending\}/);
  assert.match(source, /setConfirmRelease\(false\)/);
  assert.match(source, /if \(state\.success\)/);
  assert.match(source, /router\.refresh\(\)/);
});

test("content release lists show deterministic version choices and latest released history", () => {
  const page = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
  assert.match(page, /sortClientContentReleaseOptions\(contentVersions\.filter/);
  assert.match(page, /newestClientContentReleases\(releases\)/);
});

test("content release continues checking exact version and permissions on the server", () => {
  const source = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  assert.match(source, /requireRole\("admin"\)/);
  assert.match(source, /getAccessibleClient\(clientId\)/);
  assert.match(source, /isContentVersionReleaseEligible/);
  assert.match(source, /createAccessibleClientContentRelease/);
});
