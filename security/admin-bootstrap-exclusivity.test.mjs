import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");

test("production bootstrap must check sole-admin role count before any Auth invitation or role write", () => {
  const source = read("scripts/bootstrap-admin.ts");
  const checks = [
    '.select("profile_id", { count: "exact", head: true })',
    '.eq("role", "admin");',
    "assertAdminBootstrapRoleCount(existingAdminCount);",
    "let user = await findUserByEmail(email);",
    "assertSoleAdminBootstrapTransition({",
    'admin.auth.admin.inviteUserByEmail(email)',
    '.from("profiles").insert',
    '.from("user_roles").insert',
  ];
  for (const expected of checks) {
    assert.ok(source.includes(expected), "Missing bootstrap security boundary: " + expected);
  }
  const roleCount = source.indexOf('admin\n  .from("user_roles")');
  const preflight = source.indexOf("assertAdminBootstrapRoleCount(existingAdminCount);");
  const authLookup = source.indexOf("let user = await findUserByEmail(email);");
  const inviteGuard = source.indexOf("if (existingAdminCount !== 0)");
  const invite = source.indexOf("admin.auth.admin.inviteUserByEmail(email)");
  const transition = source.indexOf("  assertSoleAdminBootstrapTransition({");
  const profileInsert = source.indexOf('.from("profiles").insert');
  const roleInsert = source.indexOf('.from("user_roles").insert');
  assert.ok(roleCount >= 0 && roleCount < preflight);
  assert.ok(preflight < authLookup && authLookup < inviteGuard && inviteGuard < invite);
  assert.ok(invite < transition && transition < profileInsert && transition < roleInsert);
  assert.doesNotMatch(source, /console\.(?:log|error)\(.*(?:email|user\.id|profileId)/);
});

test("privileged bootstrap remains manual, on master and without account secrets in workflow output", () => {
  const source = read(".github/workflows/bootstrap-patty-admin.yml");
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /github.ref == 'refs\/heads\/master'/);
  assert.match(source, /BOOTSTRAP_PATTY/);
  assert.doesNotMatch(source, /pull_request:/);
  assert.doesNotMatch(source, /push:/);
  assert.doesNotMatch(source, /echo .*ADMIN_BOOTSTRAP_EMAIL/);
});
