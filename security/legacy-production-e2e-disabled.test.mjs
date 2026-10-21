import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// A workflow_dispatch button for an old smoke may still exist in GitHub,
// but invoking it must NOT run any synthetic operation on the hosted Supabase.
const root = new URL("../", import.meta.url);
const legacyWorkflows = [
  "e2e-admin-anamnesis-corrections.yml",
  "e2e-admin-private-files.yml",
  "e2e-anamnesis-clarifications.yml",
  "e2e-client-anamnesis-canonical-consent.yml",
  "e2e-client-anamnesis-canonical-start.yml",
  "e2e-client-anamnesis-conditional-submit.yml",
  "e2e-end-client-assignment.yml",
  "e2e-post-migration-runtime.yml",
  "e2e-private-files.yml",
];

for (const filename of legacyWorkflows) {
  test("production legacy smoke cannot execute: " + filename, () => {
    const source = readFileSync(
      new URL(".github/workflows/" + filename, root), "utf8",
    );
    assert.match(source, /^name: "LEGADO BLOQUEADO - /m);
    // Git preserves the workflow's safety contract independently of checkout
    // line endings. Accept CRLF and LF so a Windows checkout cannot turn the
    // guard itself into a false-negative.
    assert.match(source, /^on:\r?\n  workflow_dispatch:\s*$/m);
    assert.match(source, /^permissions:\r?\n  contents: read$/m);
    assert.match(source, /^  legacy-smoke-blocked:$/m);
    assert.match(source, /Legacy production E2E disabled/);
    assert.match(source, /^          exit 1$/m);
    assert.match(source, /GITHUB_STEP_SUMMARY/);
    assert.doesNotMatch(source, /\$\{\{\s*secrets\./);
    assert.doesNotMatch(source, /E2E_ADMIN_(?:PASSWORD|TOTP_SECRET)/);
    assert.doesNotMatch(source, /SUPABASE_(?:SECRET_KEY|ACCESS_TOKEN|DB_PASSWORD)/);
    assert.doesNotMatch(source, /\.supabase\.co|supabase link|supabase db push/);
    assert.doesNotMatch(source, /npx playwright|npm install|node e2e\//);
  });
}

test("seven synthetic localhost journeys remain active and separate", () => {
  const workflows = [
    "validate-j1-local-onboarding-browser.yml",
    "validate-j2-weekly-feedback-browser.yml",
    "validate-j3-assessment-browser.yml",
    "validate-j4-nutrition-browser.yml",
    "validate-j5-training-browser.yml",
    "validate-j6-educational-release-browser.yml",
    "validate-j7-ai-review-browser.yml",
  ];
  for (const filename of workflows) {
    const source = readFileSync(
      new URL(".github/workflows/" + filename, root), "utf8",
    );
    assert.match(source, /^  pull_request:/m);
    assert.doesNotMatch(source, /^name: "LEGADO BLOQUEADO/m);
    assert.match(source, /supabase start/);
  }
});
