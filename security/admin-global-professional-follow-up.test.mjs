import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20261101124800_admin_global_professional_follow_up_insert.sql","utf8");
const action = readFileSync("app/admin/avaliacoes/[avaliacaoId]/actions.ts","utf8");
const workflow = readFileSync(".github/workflows/validate-method-configuration-foundation.yml","utf8");
const pgtap = readFileSync("supabase/tests/database/admin_global_professional_follow_up.test.sql","utf8");

test("admin historical follow-up remains narrowly scoped append-only", () => {
  const sql = migration.replace(/^--.*$/gm,"");
  assert.match(sql,/CREATE POLICY professional_follow_ups_insert_admin_global_aal2/);
  assert.match(sql,/ON public\.professional_follow_ups\s+FOR INSERT TO authenticated/);
  assert.match(sql,/author_profile_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/r\.role = 'admin'/);
  assert.match(sql,/auth\.jwt\(\) ->> 'aal'/);
  assert.match(sql,/assessment_id IS NOT NULL/);
  assert.match(sql,/a\.client_id = professional_follow_ups\.client_id/);
  assert.match(sql,/a\.finalized_at IS NOT NULL/);
  assert.match(sql,/admin_global_select_aal2/);
  assert.match(sql,/admin_mfa_aal2_required/);
  assert.match(sql,/professional_follow_ups_finalized_assessment_guard/);
  assert.match(sql,/professional_follow_ups_assessment_client_fkey/);
  assert.doesNotMatch(sql,/\b(?:DROP|ALTER|GRANT|REVOKE|UPDATE|DELETE)\s+(?:POLICY|TABLE|ON|public\.)/i);
  assert.doesNotMatch(sql,/CREATE POLICY[^;]+FOR (?:ALL|SELECT|UPDATE|DELETE)\b/i);
});

test("server action keeps MFA, assessment finalization and real author",()=>{
  const start=action.indexOf("export async function addProfessionalFollowUp(");
  const end=action.indexOf("export type AssessmentDraftActionState",start);
  assert.ok(start>=0 && end>start);
  const block=action.slice(start,end);
  assert.match(block,/await requireRole\("admin"\)/);
  assert.match(block,/getAccessibleClientAssessment\(assessmentId\)/);
  assert.match(block,/!assessment\.finalized_at/);
  assert.match(block,/authorProfileId: context\.profileId/);
  assert.match(block,/decisionReason: reasonValue\.trim\(\)/);
  assert.match(block,/createAccessibleProfessionalFollowUp/);
  assert.doesNotMatch(block,/createAdminClient|service.role|startCurrentAdminClientAssignment/);
  assert.doesNotMatch(block,/atribuição atual/);
});

test("disposable pgTAP and CI cover rejected clients and admin without MFA",()=>{
  assert.match(workflow,/Run admin global professional follow-up pgTAP/);
  assert.match(pgtap,/Unassigned admin with MFA records historical follow-up/);
  assert.match(pgtap,/Admin AAL1 is refused/);
  assert.match(pgtap,/Client cannot write professional history/);
  assert.match(pgtap,/Authenticated non-admin AAL2 cannot write professional history/);
  assert.match(pgtap,/Admin cannot forge another author/);
  assert.match(pgtap,/Finalization trigger refuses draft assessment/);
  assert.match(pgtap,/Relationship trigger refuses cross-client assessment/);
  assert.match(pgtap,/No UPDATE, DELETE or anonymous INSERT granted/);
});
