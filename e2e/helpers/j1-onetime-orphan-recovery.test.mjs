import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { KNOWN_ORPHAN, oneTimeLedger } from "./j1-onetime-orphan-recovery.mjs";

const validEnv = Object.freeze({
  GITHUB_ACTIONS: "true",
  GITHUB_REPOSITORY: "leandrosilveiradepaula/projeto-patty",
  GITHUB_REF: "refs/heads/master",
  J1_EXACT_ORPHAN_RECOVERY: "true",
  GITHUB_RUN_ID: "12345",
  GITHUB_RUN_ATTEMPT: "1",
});
const born = Date.parse(KNOWN_ORPHAN.createdAt);

test("one-time orphan recovery is scoped to exactly one read-only-audited synthetic record", () => {
  assert.match(KNOWN_ORPHAN.email, /^e2e-onboarding-[0-9a-f]{16}@example[.]invalid$/);
  assert.match(KNOWN_ORPHAN.profileId, /^[0-9a-f-]{36}$/);
  assert.match(KNOWN_ORPHAN.clientId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(oneTimeLedger(validEnv, born + 5*60*1000), {
    runId: "12345", attempt: "1", startedAt: born, email: KNOWN_ORPHAN.email,
    profileId: KNOWN_ORPHAN.profileId, clientId: KNOWN_ORPHAN.clientId,
  });
});

test("recovery rejects other repositories, untrusted branches, disabled switch and malformed run identity", () => {
  for (const overrides of [
    {GITHUB_ACTIONS: "false"},
    {GITHUB_REPOSITORY: "someone/other-repository"},
    {GITHUB_REF: "refs/heads/codex/j1"}, 
    {J1_EXACT_ORPHAN_RECOVERY: "false"},
    {GITHUB_RUN_ID: "undefined"},
    {GITHUB_RUN_ATTEMPT: "1-other"},
  ]) {
    assert.throws(() => oneTimeLedger({...validEnv,...overrides}, born + 1000),
      /trusted master workflow/, JSON.stringify(overrides));
  }
});

test("expired evidence and future time reject destructive reconciliation", () => {
  assert.throws(() => oneTimeLedger(validEnv, born - 1), /expired/);
  assert.throws(() => oneTimeLedger(validEnv, born + 8*3600*1000 + 1), /expired/);
});

test("trusted workflow runs after a successful master push, never PR code", () => {
  const content = readFileSync(new URL("../../.github/workflows/j1-one-time-fixture-recovery.yml",import.meta.url),"utf8");
  for(const required of [
    "workflow_run:", "github.ref == 'refs/heads/master'",
    "github.event.workflow_run.event == 'push'",
    "github.event.workflow_run.head_branch == 'master'",
    "github.event.workflow_run.head_sha == github.sha",
    "github.event.workflow_run.conclusion == 'success'",
    'J1_EXACT_ORPHAN_RECOVERY: "true"',
    "j1-onetime-orphan-recovery.mjs",
  ]) assert.ok(content.includes(required),required);
  assert.doesNotMatch(content,/pull_request:/);
  assert.doesNotMatch(content,/permissions:[\s\S]*contents: write/);
  assert.doesNotMatch(content,/ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
});
