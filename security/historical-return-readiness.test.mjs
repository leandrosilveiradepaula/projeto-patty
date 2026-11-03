import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const backend = readFileSync("lib/onboarding/historical-client-return-readiness.ts", "utf8");
const actions = readFileSync("app/admin/clientes/[clienteId]/actions.ts", "utf8");
const page = readFileSync("app/admin/clientes/[clienteId]/page.tsx", "utf8");
const form = readFileSync("components/admin/HistoricalClientReturnReadinessForm.tsx", "utf8");
const preflight = readFileSync("lib/onboarding/historical-client-return-preflight.ts", "utf8");

test("readiness refreshes current backend state under session RLS and admin MFA", () => {
  assert.match(backend, /import "server-only"/);
  assert.match(backend, /await requireRole\("admin"\)/);
  assert.match(backend, /await createClient\(\)/);
  assert.match(backend, /\.from\("clients"\)/);
  assert.match(backend, /\.from\("client_assignments"\)/);
  assert.match(backend, /\.is\("ended_at", null\)/);
  assert.match(backend, /\.eq\("id", input\.clientId\)/);
  assert.match(backend, /\.eq\("client_id", input\.clientId\)/);
  assert.match(backend, /previewHistoricalClientReturn\(/);
  assert.match(backend, /if \(clientResponse\.error \|\| assignmentsResponse\.error\)/);
  assert.doesNotMatch(backend, /createAdminClient|auth\.admin|service_role|auth\.users|raw_user_meta_data|email|phone|display_name/);
  assert.doesNotMatch(backend, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
});

test("readiness action uses explicit human review and does not return client health data", () => {
  assert.match(actions, /export async function inspectHistoricalClientReturnAction\(/);
  const start = actions.indexOf("export async function inspectHistoricalClientReturnAction(");
  const action = actions.slice(start);
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(action, /confirmedClientId/);
  assert.match(action, /identityReviewedByHuman/);
  assert.match(action, /inspectHistoricalClientReturnReadiness\(/);
  assert.match(action, /return \{ status: result\.status, reasons: result\.reasons \}/);
  assert.doesNotMatch(action, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|createAdminClient|inviteUserByEmail|generateLink|redirect\(/);
  assert.match(preflight, /persistence: "none"/);
  assert.match(preflight, /status: "blocked" \| "pending_authorized_backend_verification"/);
});

test("historical return panel is shown only for inactive unlinked Clients", () => {
  assert.match(page, /client\.status === "inactive" && !client\.profile_id/);
  assert.match(page, /<HistoricalClientReturnReadinessForm clientId=\{client\.id\}/);
  assert.match(form, /name="confirmedClientId"/);
  assert.match(form, /name="identityReviewedByHuman"/);
  assert.match(form, /useActionState\(/);
  assert.match(form, /Nenhum acesso foi criado/);
  assert.doesNotMatch(form, /password|auth\.signUp|createAdminClient|inviteUserByEmail/i);
});
