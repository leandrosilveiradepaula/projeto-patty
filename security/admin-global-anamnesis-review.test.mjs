import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20261101135000_admin_global_anamnesis_review_insert.sql","utf8");
const testSql = readFileSync("supabase/tests/database/admin_global_anamnesis_review.test.sql","utf8");
const workflow = readFileSync(".github/workflows/validate-method-configuration-foundation.yml","utf8");
const access = readFileSync("lib/supabase/data-access.ts","utf8");

test("human review is admin AAL2 append-only, submitted-only, and fails closed", () => {
  const sql = migration.replace(/^--.*$/gm,"");
  assert.match(sql,/CREATE POLICY anamnesis_reviews_insert_admin_global_aal2/);
  assert.match(sql,/FOR INSERT TO authenticated/);
  assert.match(sql,/reviewer_profile_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/auth\.jwt\(\) ->> 'aal'/);
  assert.match(sql,/r\.role = 'admin'/);
  assert.match(sql,/s\.submitted_at IS NOT NULL/);
  assert.match(sql,/admin_mfa_aal2_required/);
  assert.match(sql,/admin_global_select_aal2/);
  assert.match(sql,/has_table_privilege\('anon'/);
  assert.doesNotMatch(sql,/CREATE POLICY[^;]+FOR (?:ALL|UPDATE|DELETE|SELECT)\b/i);
  assert.doesNotMatch(sql,/DROP POLICY|DISABLE ROW LEVEL SECURITY|\bGRANT\b|\bREVOKE\b/i);
});

test("existing admin action inserts reviewer note via session instead of service role", () => {
  const start=access.indexOf("export async function createAccessibleAnamnesisReview(");
  const end=access.indexOf("\nexport async function ",start+1);
  const body=access.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.match(body,/await createClient\(\)/);
  assert.match(body,/\.from\("anamnesis_reviews"\)\.insert/);
  assert.match(body,/reviewer_profile_id: reviewerProfileId/);
  assert.doesNotMatch(body,/createAdminClient|service_role|update\(/);
});

test("pgTAP verifies sent-only positive and client, role, MFA, author, draft denials", () => {
  assert.match(workflow,/Run admin global anamnesis review pgTAP/);
  assert.match(testSql,/without assignment/);
  assert.match(testSql,/Review appended to historical submission exactly once/);
  assert.match(testSql,/Draft anamnesis cannot be reviewed/);
  assert.match(testSql,/Admin cannot forge reviewer identity/);
  assert.match(testSql,/Admin AAL1 cannot append human review/);
  assert.match(testSql,/Client cannot append professional anamnesis review/);
  assert.match(testSql,/Non-admin AAL2 cannot append professional review/);
  assert.match(testSql,/Human reviews stay append-only/);
});
