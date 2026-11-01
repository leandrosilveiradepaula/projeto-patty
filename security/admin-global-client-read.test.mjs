import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20261101121000_admin_global_read_aal2.sql",
  "utf8",
);
const dataAccess = readFileSync("lib/supabase/data-access.ts", "utf8");
const adminDirectory = readFileSync("app/admin/clientes/page.tsx", "utf8");

test("global admin read only adds policies for existing RLS tables guarded by MFA", () => {
  assert.match(migration, /c\.relrowsecurity/);
  assert.match(migration, /admin_mfa_aal2_required/);
  assert.match(migration, /p\.permissive = 'RESTRICTIVE'/);
  assert.match(migration, /CREATE POLICY admin_global_select_aal2/);
  assert.match(migration, /FOR SELECT TO authenticated/);
  assert.match(migration, /r\.profile_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /r\.role = ''admin''/);
  assert.match(migration, /auth\.jwt\(\) ->> ''aal''/);
  assert.match(migration, /= ''aal2''/);
  const sqlOnly = migration.replace(/^--.*$/gm, "");
  assert.doesNotMatch(sqlOnly, /CREATE POLICY[^;]+FOR (?:ALL|UPDATE|INSERT|DELETE)\b/i);
  assert.doesNotMatch(sqlOnly, /\bDROP POLICY\b|\bDISABLE ROW LEVEL SECURITY\b|\bBYPASSRLS\b|\bGRANT\b/i);
});

test("allowlist is explicit and does not broaden roles, mutations or future tables", () => {
  const entries = [...migration.matchAll(/^    '([a-z_]+)'[,]?$/gm)].map((item) => item[1]);
  assert.equal(entries.length, 73);
  assert.equal(new Set(entries).size, entries.length);
  for (const required of [
    "clients", "client_registration", "anamnesis_submissions",
    "client_assessments", "assessment_measurements", "protocols",
    "protocol_versions", "client_training_plans", "client_files",
    "client_assignments", "profiles", "client_weekly_feedbacks",
  ]) assert.ok(entries.includes(required), required);
  assert.ok(!entries.includes("user_roles"));
  assert.match(migration, /FOREACH target_table IN ARRAY ARRAY/);
});

test("client directory never uses privileged bypass or requires an active assignment", () => {
  const match = dataAccess.match(
    /export async function listAllClientsForCurrentAdmin\(\)\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(match, "global directory method exists");
  assert.match(match[1], /await requireRole\("admin"\)/);
  assert.match(match[1], /await createClient\(\)/);
  assert.match(match[1], /\.from\("clients"\)/);
  assert.match(match[1], /\.order\("id"/);
  assert.doesNotMatch(match[1], /createAdminClient|service.role|client_assignments|\.is\("ended_at"/);
  assert.match(adminDirectory, /listAllClientsForCurrentAdmin\(\)/);
  assert.doesNotMatch(adminDirectory, /listClientsAssignedToCurrentAdmin\(/);
  assert.match(adminDirectory, /Todas as clientes/);
  assert.match(adminDirectory, /Cliente inativa/);
});
