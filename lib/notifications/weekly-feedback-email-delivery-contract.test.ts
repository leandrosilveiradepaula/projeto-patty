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
