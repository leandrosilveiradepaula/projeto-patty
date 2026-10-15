import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync(new URL("./weekly-feedback-email-delivery.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../../app/api/cron/weekly-feedback-email-delivery/route.ts", import.meta.url), "utf8");

test("reminder links use trusted deployment configuration before claiming work", () => {
  assert.match(worker, /resolveTrustedClientAccessOrigin\(\)/);
  assert.ok(worker.indexOf("resolveTrustedClientAccessOrigin()") < worker.indexOf("claim_weekly_feedback_email_deliveries_server"));
  assert.doesNotMatch(worker, /new URL\(input\.appOrigin\)/);
  assert.doesNotMatch(route, /new URL\(request\.url\)\.origin/);
});
test("cron does not report success when SMTP is absent or some messages fail", () => {
  assert.match(route, /ok: result\.configured && result\.failed === 0/);
  assert.match(route, /!result\.configured \? 503 : result\.failed > 0 \? 207 : 200/);
  assert.match(route, /authorization !== `Bearer \$\{cronSecret\}`/);
});

test("bad period in one claimed reminder fails individually and does not halt subsequent claims", () => {
  const loop = worker.indexOf("for (const claim of claims ?? [])");
  const recovery = worker.indexOf("try {", loop);
  const content = worker.indexOf("buildWeeklyFeedbackEmailContent({", loop);
  const delivery = worker.indexOf("sendGmailSmtpEmail(smtpConfig, {", loop);
  const failure = worker.indexOf('"fail_weekly_feedback_email_delivery_server"', loop);
  const next = worker.indexOf("continue;", failure);
  assert.ok(loop >= 0 && recovery > loop && content > recovery && delivery > content);
  assert.ok(failure > delivery && next > failure);
  assert.match(worker,/p_attempt_id: claim\.attempt_id/);
  assert.match(worker,/failed \+= 1/);
});
