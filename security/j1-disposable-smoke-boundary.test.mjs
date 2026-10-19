import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("J1 production fixture workflow is retired in favor of local-only E2E", () => {
  assert.equal(existsSync(new URL(".github/workflows/e2e-client-onboarding-activation.yml", root)), false);
  const local = read(".github/workflows/validate-j1-local-onboarding-browser.yml");
  assert.match(local, /pull_request:/);
  assert.match(local, /workflow_dispatch:/);
  assert.match(local, /npx supabase start/);
  assert.match(local, /npx supabase db reset/);
  assert.match(local, /test "\$API_URL" = "http:\/\/127\.0\.0\.1:54321"/);
  assert.match(local, /J1_E2E_LOCAL_ONLY: "true"/);
  assert.match(local, /OPENAI_HEALTH_DATA_PROCESSING_ENABLED: "false"/);
  assert.match(local, /OPENAI_API_KEY: ""/);
  assert.match(local, /npx supabase stop --no-backup/);
  assert.doesNotMatch(local, /secrets\./);
  assert.doesNotMatch(local, /hqanoskwjvpbgavppcud/);
  assert.doesNotMatch(local, /workflow_run:/);
  assert.doesNotMatch(local, /github\.event\.context == 'Vercel'/);
});

test("J1 browser fixtures and writes are unreachable outside disposable localhost", () => {
  const script = read("e2e/j1-local-onboarding.spec.mjs");
  assert.match(script, /J1_E2E_LOCAL_ONLY !== "true"/);
  assert.match(script, /apiURL !== "http:\/\/127\.0\.0\.1:54321"/);
  assert.match(script, /baseURL !== "http:\/\/127\.0\.0\.1:3000"/);
  assert.match(script, /Boolean\(process\.env\.OPENAI_API_KEY\)/);
  assert.match(script, /throw new Error\("J1 local SQL boundary rejected"\)/);
  assert.match(script, /const fixtureTables = new Set/);
  assert.match(script, /getPublishedAnamnesisFromMigrations\(\)/);
  assert.match(script, /"client-anamnesis"/);
  assert.match(script, /"e2e-j1-owner-" \+ nonce \+ "@example\.invalid"/);
  assert.match(script, /form\[data-interactive="true"\]/);
  assert.match(script, /expect\(drafts\)\.toHaveLength\(1\)/);
  assert.match(script, /await expect\(visitor\)\.toHaveURL/);
  assert.match(read("e2e/client-onboarding-activation.spec.mjs"), /throw new Error\("Legacy production J1 smoke retired/);
});

test("J1 start action is unchanged while hydrated form prevents duplicate submits", () => {
  const page = read("app/cliente/anamnese/page.tsx");
  const start = read("components/client/StartAnamnesisForm.tsx");
  assert.match(page, /<StartAnamnesisForm action=\{startClientAnamnesisDraft\} \/>/);
  assert.match(start, /useFormStatus\(\)/);
  assert.match(start, /loading=\{pending\} disabled=\{pending\}/);
  assert.match(start, /data-interactive=\{hydrated \? "true" : undefined\}/);
  assert.match(start, /<form action=\{action\}/);
  const action = read("app/cliente/anamnese/actions.ts");
  assert.match(action, /await requireRole\("client"\)/);
  assert.match(action, /startCurrentClientAnamnesisDraft\(\)/);
  assert.match(action, /redirect\(`\/cliente\/anamnese\/\$\{submissionId\}`\)/);
});
