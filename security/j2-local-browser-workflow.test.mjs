import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

/**
 * Production E2E workflows retain their existing master-only security gate.
 * This separate PR-triggered browser workflow is safe precisely because it
 * cannot use production URLs, credentials, or persist local medical test data.
 */
test("J2 PR browser workflow has no external credentials or production endpoint", () => {
  const workflow = read(".github/workflows/validate-j2-weekly-feedback-browser.yml");
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.match(workflow, /test "\$API_URL" = "http:\/\/127\.0\.0\.1:54321"/);
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL=\$API_URL/);
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\$ANON_KEY/);
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_.*SERVICE_ROLE|NEXT_PUBLIC_.*SECRET_KEY/i);
  assert.match(workflow, /export J2_E2E_SERVICE_ROLE_KEY="\$SERVICE_ROLE_KEY"/);
  assert.match(workflow, /npx supabase start/);
  assert.match(workflow, /npx supabase db reset/);
  assert.match(workflow, /npx supabase stop --no-backup/);
  assert.match(workflow, /if: always\(\)/);
});

test("J2 browser process explicitly refuses a remote Supabase or Next server", () => {
  const spec = read("e2e/j2-weekly-feedback-lifecycle.spec.mjs");
  assert.match(spec, /process\.env\.J2_E2E_LOCAL_ONLY !== "true"/);
  assert.match(spec, /baseUrl !== "http:\/\/127\.0\.0\.1:3000"/);
  assert.match(spec, /supabaseUrl !== "http:\/\/127\.0\.0\.1:54321"/);
  assert.match(spec, /new Error\("J2 browser E2E requires the isolated local Supabase/);
  assert.match(spec, /e2e-j2-/);
  assert.match(spec, /example\\\.invalid/);
  assert.match(spec, /loginAdminWithMfa/);
  assert.match(spec, /supabase_db_projeto-patty/);
  assert.match(spec, /execFileSync\("docker"/);
  assert.doesNotMatch(spec, /service\.from\(/);
  assert.match(spec, /clientApi\.rpc\("save_client_weekly_feedback_if_unchanged"/);
  assert.match(spec, /unassigned.*Totp|unassignedTotp/);
  assert.doesNotMatch(spec, /process\.env\.(?:E2E_BASE_URL|E2E_SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEY)|NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});

test("TOTP is enabled only by a local runner patch and never committed in the Supabase config", () => {
  const committed = read("supabase/config.toml");
  const workflow = read(".github/workflows/validate-j2-weekly-feedback-browser.yml");
  assert.match(committed, /\[auth\.mfa\.totp\]\nenroll_enabled = false\nverify_enabled = false/);
  assert.match(workflow, /const before="\[auth\.mfa\.totp\]\\nenroll_enabled = false\\nverify_enabled = false"/);
  assert.match(workflow, /const after="\[auth\.mfa\.totp\]\\nenroll_enabled = true\\nverify_enabled = true"/);
});
