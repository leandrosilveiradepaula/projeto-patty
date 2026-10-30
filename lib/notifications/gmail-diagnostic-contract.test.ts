import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const server = readFileSync(new URL("./gmail-diagnostic.ts", import.meta.url), "utf8");
const action = readFileSync(new URL("../../app/admin/diagnostico-email/actions.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../../app/admin/diagnostico-email/page.tsx", import.meta.url), "utf8");
test("diagnostic is admin AAL2 and never uses the production queue", () => {
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(page, /await requireRole\("admin"\)/);
  assert.doesNotMatch(action + server, /claim_weekly_feedback|deliverWeeklyFeedbackReminderEmails|createServiceRoleClient/);
});
test("recipient is server configuration, never user input", () => {
  assert.match(server, /process\.env\.GMAIL_SMTP_TEST_RECIPIENT/);
  assert.doesNotMatch(action, /formData\.get|recipient|to:/);
  assert.match(server, /to: recipient/);
  assert.match(server, /catch \{/);
  assert.doesNotMatch(server, /console\.|providerMessageId/);
});

test("external SMTP branding uses Corpo & Mente, without changing transport policy", () => {
  const smtp = readFileSync(new URL("./gmail-smtp.ts", import.meta.url), "utf8");
  const weekly = readFileSync(new URL("./weekly-feedback-email-content.ts", import.meta.url), "utf8");
  assert.match(smtp, /process\.env\.GMAIL_SMTP_FROM_NAME/);
  assert.match(smtp, /"Consultoria Corpo & Mente"/);
  assert.match(weekly, /"Consultoria Corpo & Mente"/);
  assert.match(server, /"Corpo & Mente — diagnóstico SMTP"/);
  assert.match(server, /Teste sintético de entrega SMTP do Corpo & Mente/);
  for (const source of [smtp, weekly, server]) {
    assert.doesNotMatch(source, /"Consultoria Corpo e Mente - Patty"|"Projeto Patty — diagnóstico SMTP"|Teste sintético de entrega SMTP do Projeto Patty/);
  }
  assert.match(smtp, /host: "smtp\.gmail\.com", port: 465/);
  assert.match(smtp, /rejectUnauthorized: true/);
  assert.match(server, /GMAIL_SMTP_TEST_RECIPIENT/);
});
