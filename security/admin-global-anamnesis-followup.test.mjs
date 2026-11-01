import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(name, "utf8");
const migration = read("supabase/migrations/20261101141500_admin_global_anamnesis_followup_insert.sql");
const pgtap = read("supabase/tests/database/admin_global_anamnesis_followup.test.sql");
const workflow = read(".github/workflows/validate-method-configuration-foundation.yml");
const correction = read("app/admin/anamneses/[anamneseId]/correcoes/actions.ts");
const clarification = read("app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts");
const review = read("app/admin/anamneses/[anamneseId]/revisao/actions.ts");

test("three narrowly scoped authenticated INSERTs require admin, AAL2 and exact author",()=>{
  const policies = [
    ["anamnesis_answer_corrections","corrected_by_profile_id"],
    ["anamnesis_clarification_requests","requested_by_profile_id"],
    ["anamnesis_clarification_resolutions","resolved_by_profile_id"],
  ];
  for(const [table,author] of policies){
    const name = table+"_insert_admin_global_aal2";
    const part = migration.slice(migration.indexOf("CREATE POLICY "+name));
    assert.match(part,new RegExp("ON public\\."+table+" FOR INSERT TO authenticated"));
    assert.match(part,new RegExp(author+"=\\(SELECT auth\\.uid\\(\\)\\)"));
    assert.match(part,/auth\.jwt\(\) ->> 'aal'/);
    assert.match(part,/ur\.role='admin'/);
  }
  assert.match(migration,/SECURITY INVOKER/);
  assert.match(migration,/admin_mfa_aal2_required/);
  assert.match(migration,/admin_global_select_aal2/);
  assert.match(migration,/anamnesis_clarification_requests_validate/);
  assert.match(migration,/anamnesis_clarification_resolutions_validate/);
  assert.match(migration,/anamnesis_answer_corrections_immutable/);
  assert.match(migration,/s\.submitted_at IS NOT NULL/);
  assert.match(migration,/a\.submission_id=anamnesis_clarification_requests\.submission_id/);
  assert.doesNotMatch(migration,/DROP POLICY|DISABLE ROW LEVEL SECURITY|\bGRANT\b|\bREVOKE\b|SECURITY DEFINER/i);
  assert.doesNotMatch(migration,/CREATE POLICY[^;]+FOR (?:ALL|SELECT|UPDATE|DELETE)\b/i);
});

test("three server actions preserve human identity, submitted state and exact relationships",()=>{
  for (const source of [correction,clarification,review]) {
    assert.match(source,/await requireRole\("admin"\)/);
    assert.doesNotMatch(source,/createAdminClient|service_role|startCurrentAdminClientAssignment/);
    assert.doesNotMatch(source,/atribuição atual/);
  }
  assert.match(correction,/answer\.submission_id !== submission\.id/);
  assert.match(correction,/!submission\.submitted_at/);
  assert.match(correction,/correctedByProfileId: context\.profileId/);
  assert.match(clarification,/sourceAnswer\.submission_id !== submission\.id/);
  assert.match(clarification,/request\.submission_id !== submission\.id/);
  assert.match(clarification,/requestedByProfileId: context\.profileId/);
  assert.match(clarification,/resolvedByProfileId: context\.profileId/);
  assert.match(review,/!submission\.submitted_at/);
});

test("disposable database CI asserts historical success and critical denials",()=>{
  assert.match(workflow,/Run historical anamnesis correction and clarification pgTAP/);
  for(const label of [
    "without assignment can append correction",
    "Original answer remains unchanged",
    "Cannot correct draft answer",
    "Correction author cannot be forged",
    "without assignment may request clarification",
    "Source answer must belong to same submission",
    "without assignment can resolve historical clarification",
    "Admin AAL1 cannot correct an answer",
    "Client cannot append professional correction",
    "Nonadmin AAL2 cannot resolve clarification",
  ]) assert.ok(pgtap.includes(label),label);
});
