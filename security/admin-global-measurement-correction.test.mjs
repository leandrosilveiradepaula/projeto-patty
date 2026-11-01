import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20261101133000_admin_global_measurement_correction_insert.sql","utf8");
const pgtap = readFileSync("supabase/tests/database/admin_global_measurement_correction.test.sql","utf8");
const workflow = readFileSync(".github/workflows/validate-method-configuration-foundation.yml","utf8");
const action = readFileSync("app/admin/avaliacoes/[avaliacaoId]/actions.ts","utf8");

test("global correction only adds append-only INSERT and retains trigger guards", () => {
  const sql = migration.replace(/^--.*$/gm,"");
  assert.match(sql,/CREATE POLICY assessment_measurement_corrections_insert_admin_global_aal2/);
  assert.match(sql,/FOR INSERT TO authenticated/);
  assert.match(sql,/corrected_by_profile_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/ur\.role = 'admin'/);
  assert.match(sql,/auth\.jwt\(\) ->> 'aal'/);
  assert.match(sql,/a?ca\.finalized_at IS NOT NULL/);
  assert.match(sql,/admin_mfa_aal2_required/);
  assert.match(sql,/admin_global_select_aal2/);
  assert.match(sql,/assessment_measurement_corrections_immutable/);
  assert.match(sql,/SECURITY INVOKER/);
  assert.doesNotMatch(sql,/DISABLE ROW LEVEL SECURITY|DROP POLICY|GRANT |REVOKE |BYPASSRLS/i);
  assert.doesNotMatch(sql,/CREATE POLICY[^;]+FOR (?:ALL|SELECT|UPDATE|DELETE)\b/i);
});

test("real J3 action retains authenticated editor, explicit finalized state and original measurements", () => {
  const start = action.indexOf("export async function correctFinalizedAssessmentMeasurementAction(");
  const body = action.slice(start);
  assert.match(body,/await requireRole\("admin"\)/);
  assert.match(body,/!assessment\.finalized_at/);
  assert.match(body,/measurements\.find\(\(item\) => item\.id === measurementId\)/);
  assert.match(body,/correctedByProfileId: context\.profileId/);
  assert.match(body,/createAccessibleAssessmentMeasurementCorrection/);
  assert.doesNotMatch(body,/createAdminClient|startCurrentAdminClientAssignment|update\(\{\s*measurement_value/);
});

test("database tests assert no assignment, MFA denial, spoof denial, draft guard and append-only", () => {
  assert.match(workflow,/Run admin global measurement correction pgTAP/);
  assert.match(pgtap,/without assignment/);
  assert.match(pgtap,/Admin AAL1 is denied/);
  assert.match(pgtap,/Admin cannot forge another profile author/);
  assert.match(pgtap,/Draft assessment cannot receive correction/);
  assert.match(pgtap,/Original measurement remains unchanged/);
  assert.match(pgtap,/Client cannot write professional correction/);
  assert.match(pgtap,/Non-admin authenticated account cannot write correction/);
  assert.match(pgtap,/Append-only SQL privileges stay intact/);
});
