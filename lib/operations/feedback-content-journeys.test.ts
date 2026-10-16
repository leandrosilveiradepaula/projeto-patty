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
  assert.match(page, /describeWeeklyFeedbackReminderEvidence\(feedback\.request_source, reminderEvent\)/);
  const presentation = read("lib/follow-up/weekly-feedback-reminder-presentation.ts");
  assert.match(presentation, /describeAdminFeedbackReminder\(lastEvent\)/);
});

test("client weekly feedback has a non-submitting draft and text-limit guidance", () => {
  const source = read("app/cliente/feedback-semanal/page.tsx");
  assert.match(source, /Salvar rascunho não envia suas respostas/);
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.match(form, /maxLength=\{4000\}/);
  const controls = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackSubmitControls.tsx");
  assert.match(source, /<ClientWeeklyFeedbackResponseForm/);
  assert.match(form, /<ClientWeeklyFeedbackSubmitControls\s+blocked=\{newerServerSnapshot\}\s+completed=\{submitted\}\s+reviewing=\{reviewOpen\}\s+onBeforeSubmit=\{prepareSubmit\}\s*\/>/);
  assert.match(controls, /name="intent" type="submit" value="save"/);
  assert.match(controls, /name="intent" type="submit" value="submit"/);
});

test("content release requires selected exact version and explicit professional confirmation", () => {
  const source = read("components/admin/ClientContentReleaseForm.tsx");
  assert.match(source, /setConfirmRelease\(true\)/);
  assert.match(source, /Confirmar liberação/);
  assert.match(source, /disabled=\{!selectedVersion \|\| isPending \|\| state.success\}/);
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


test("manual weekly feedback locates an existing exact period without fetching health answers", () => {
  const access = read("lib/supabase/data-access.ts");
  const start = access.indexOf("export async function getAccessibleWeeklyFeedbackForPeriod(");
  const end = access.indexOf("export async function createAccessibleWeeklyFeedbackRequest(", start);
  const lookup = access.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(lookup, /\.select\("id, submitted_at"\)/);
  assert.match(lookup, /\.eq\("client_id", clientId\)/);
  assert.match(lookup, /\.eq\("period_start", periodStart\)/);
  assert.match(lookup, /\.eq\("period_end", periodEnd\)/);
  assert.doesNotMatch(lookup, /\.select\("[^"]*answers/);
  assert.doesNotMatch(lookup, /createAdminClient\(/);
});

test("manual weekly feedback returns the existing row before creating and recovers database uniqueness races", () => {
  const action = read("app/admin/clientes/[clienteId]/feedback-semanal/actions.ts");
  const lookup = action.indexOf("getAccessibleWeeklyFeedbackForPeriod(clientId, periodStart, periodEnd)");
  const write = action.indexOf("createAccessibleWeeklyFeedbackRequest({");
  assert.ok(lookup >= 0 && write > lookup);
  assert.match(action, /if \(existing\) return existingRequestState\(existing\)/);
  assert.match(action, /isDuplicatePeriodError\(error\)/);
  assert.match(action, /getAccessibleWeeklyFeedbackForPeriod\(clientId, periodStart, periodEnd\)/);
  assert.match(action, /if \(concurrent\) return existingRequestState\(concurrent\)/);
  assert.match(action, /error\.code === "23505"/);
  assert.match(action, /feedbackId: created\.id/);
  assert.doesNotMatch(action, /\.from\("client_weekly_feedbacks"\)\.upsert/);
});

test("both new and preexisting weekly feedback requests open their authorized exact record", () => {
  const form = read("components/admin/AdminWeeklyFeedbackRequestForm.tsx");
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(form, /state\.feedbackId \? \(/);
  assert.match(form, /registro=\$\{encodeURIComponent\(state\.feedbackId\)\}/);
  assert.match(form, /#feedback-\$\{state\.feedbackSubmitted \? "enviado" : "pendente"\}-\$\{encodeURIComponent\(state\.feedbackId\)\}/);
  assert.match(form, /Abrir registro exato/);
  assert.match(page, /authorizedExactRecordPage\(/);
  assert.match(page, /exactRecordLocated/);
});
