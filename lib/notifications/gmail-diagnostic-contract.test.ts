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
