import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("invitation compensation never deletes an Auth user or looks up legacy clients to delete", () => {
  const source = read("lib/onboarding/client-invitation.ts");
  const cleanup = source.slice(
    source.indexOf("async function cleanupFailedProvision"),
    source.indexOf("async function provisionInvitedUser"),
  );
  assert.doesNotMatch(source, /auth\.admin\.deleteUser\(/);
  assert.doesNotMatch(cleanup, /from\("clients"\)\s*\.select\("id"\)\s*\.eq\("profile_id"/);
  assert.match(cleanup, /if \(input\.clientId\)/);
  assert.match(cleanup, /\.eq\("id", input\.clientId\)\s*\.eq\("profile_id", input\.userId\)\s*\.select\("id"\)\s*\.single\(\)/);
  assert.match(cleanup, /if \(input\.roleCreated\)/);
  assert.match(cleanup, /if \(input\.profileCreated\)/);
  assert.match(cleanup, /if \(assignmentCleanup\.error\) return false/);
  assert.match(cleanup, /if \(error \|\| !data\) return false/);
  assert.ok(cleanup.indexOf('from("clients")') < cleanup.indexOf('from("user_roles")'));
  assert.ok(cleanup.indexOf('from("user_roles")') < cleanup.indexOf('from("profiles")'));
});

test("only confirmed newly inserted relational records are eligible for compensation", () => {
  const source = read("lib/onboarding/client-invitation.ts");
  assert.match(source, /let clientId: string \| null = null/);
  assert.match(source, /let profileCreated = false/);
  assert.match(source, /let roleCreated = false/);
  assert.match(source, /profileCreated = true/);
  assert.match(source, /roleCreated = true/);
  assert.match(source, /clientId = client\.data\.id/);
  assert.match(source, /cleanupFailedProvision\(\{\s*clientId,\s*profileCreated,\s*roleCreated,/);
  assert.match(source, /cleaned \? "identity_reconciliation_required" : "cleanup_failed"/);
  assert.match(source, /user \? "identity_reconciliation_required" : "link_failed"/);
});

test("admin actions expose a stop/reconcile instruction instead of a false clean rollback", () => {
  const actions = read("app/admin/clientes/nova/actions.ts");
  assert.equal((actions.match(/error\.code === "identity_reconciliation_required"/g) ?? []).length, 2);
  assert.match(actions, /identidade de acesso pode ter sido criada ou já existir/);
  assert.match(actions, /Não reenvie antes de revisar/);
  assert.match(actions, /Revise a conta antes de gerar outro convite/);
});

test("the synthetic onboarding E2E uses canonical name and ownership guard before Auth cleanup", () => {
  const e2e = read("e2e/client-onboarding-activation.spec.mjs");
  assert.match(e2e, /full_name: "E2E Onboarding Client"/);
  assert.match(e2e, /Refusing cleanup of a non-synthetic onboarding identity/);
  assert.match(e2e, /getUserById\(profileId\)/);
  assert.match(e2e, /authUser\.data\.user\?\.email !== email/);
  assert.match(e2e, /linkedClient\.data\?\.profile_id !== profileId/);
  assert.ok(e2e.indexOf('getUserById(profileId)') < e2e.indexOf('admin.auth.admin.deleteUser(profileId)'));
  assert.match(e2e, /cleanupSyntheticClient\(\{ clientId, profileId, email \}\)/);
});
