import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("new client onboarding requires a valid name and starts active", () => {
  const actions = read("app/admin/clientes/nova/actions.ts");
  const invitation = read("lib/onboarding/client-invitation.ts");

  assert.match(actions, /validateClientDisplayName/);
  assert.match(invitation, /displayName\.length < 2/);
  assert.match(invitation, /status: "active"/);
});

test("assignment lifecycle keeps client status aligned without deleting history", () => {
  const start = read("lib/assignments/client-assignment-start.ts");
  const end = read("lib/assignments/client-assignment-admin.ts");

  assert.match(start, /update\(\{ status: "active" \}\)/);
  assert.match(end, /remainingAssignments\.length === 0/);
  assert.match(end, /update\(\{ status: "inactive" \}\)/);
  assert.doesNotMatch(end, /from\("clients"\)[\s\S]{0,180}\.delete\(/);
});

test("admin can repair a legacy missing client name without changing Auth", () => {
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  const helper = read("lib/clients/client-profile-admin.ts");
  const form = read("components/admin/AdminClientNameEditForm.tsx");

  assert.match(action, /updateAdminClientDisplayNameAction/);
  assert.match(action, /validateClientDisplayName/);
  assert.match(action, /updateClientProfileDisplayNamePrivileged/);
  assert.match(action, /if \(client\.profile_id\)/);
  assert.doesNotMatch(action, /createAdminClient/);
  assert.match(helper, /^import "server-only";/m);
  assert.match(helper, /createAdminClient/);
  assert.match(helper, /from\("profiles"\)/);
  assert.match(helper, /display_name: input\.displayName/);
  assert.match(helper, /\.select\("id"\)\s*\.single\(\)/);
  assert.match(helper, /from\("clients"\)/);
  assert.match(helper, /full_name: input\.displayName/);
  assert.match(helper, /\.is\("profile_id", null\)/);
  assert.match(action, /updateStandaloneClientFullNamePrivileged/);
  assert.match(action, /revalidatePath\("\/cliente", "layout"\)/);
  assert.match(form, /label="Nome da cliente"/);
  assert.match(form, /required/);
});
