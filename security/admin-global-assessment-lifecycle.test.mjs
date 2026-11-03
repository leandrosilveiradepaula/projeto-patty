import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync("supabase/migrations/20261103130000_admin_global_assessment_draft_and_finalization.sql","utf8");
const pgtap=readFileSync("supabase/tests/database/admin_global_assessment_lifecycle.test.sql","utf8");
const workflow=readFileSync(".github/workflows/validate-method-configuration-foundation.yml","utf8");
const persist=readFileSync("lib/evaluations/assessment-persistence.ts","utf8");
const adminActions=readFileSync("app/admin/avaliacoes/[avaliacaoId]/actions.ts","utf8");
const createAction=readFileSync("app/admin/clientes/[clienteId]/avaliacoes/actions.ts","utf8");

test("admin assessment lifecycle requires role/AAL2 and complete draft guards",()=>{
  assert.match(migration,/client_assessments_insert_admin_global_draft_aal2/);
  assert.match(migration,/client_assessments_update_admin_global_draft_aal2/);
  assert.match(migration,/assessment_measurements_insert_admin_global_draft_aal2/);
  assert.match(migration,/assessment_measurements_update_admin_global_draft_aal2/);
  assert.match(migration,/assessment_measurements_delete_admin_global_draft_aal2/);
  assert.match(migration,/assessment_files_insert_admin_global_draft_aal2/);
  assert.match(migration,/assessment_files_delete_admin_global_draft_aal2/);
  assert.match(migration,/assessment_session_update_draft_only/);
  assert.match(migration,/WITH CHECK\s*\(\s*finalized_at IS NULL\s*AND finalized_by_profile_id IS NULL\s*AND method_configuration_snapshot_set_id IS NULL/);
  assert.match(migration,/created_by_profile_id=\(SELECT auth\.uid\(\)\)/);
  assert.match(migration,/coalesce\(\(SELECT auth\.jwt\(\)->>'aal'\)='aal2',false\)/);
  assert.match(migration,/a\.finalized_at IS NULL/);
  assert.match(migration,/f\.client_id=assessment_files\.client_id/);
  assert.match(migration,/f\.file_kind='photo'/);
  assert.doesNotMatch(migration,/GRANT UPDATE ON public\.client_assessments TO authenticated/);
  assert.match(migration,/has_column_privilege\('authenticated','public\.client_assessments','assessed_at','UPDATE'\)/);
  assert.match(migration,/has_column_privilege\('authenticated','public\.client_assessments','assessment_kind','UPDATE'\)/);
  assert.match(migration,/has_column_privilege\('authenticated','public\.client_assessments','finalized_at','UPDATE'\)/);
  assert.doesNotMatch(migration,/GRANT\s+(?:UPDATE|INSERT|DELETE)\s+ON\s+public\.client_assessments\s+TO\s+anon/i);
  assert.doesNotMatch(migration,/DISABLE ROW LEVEL SECURITY|DROP POLICY|DROP TRIGGER|SECURITY DEFINER/i);
});

test("snapshot finalization preserves original implementation and service-only boundary",()=>{
  assert.match(migration,/create or replace function public\.finalize_assessment_from_method_snapshot/);
  assert.match(migration,/security invoker/);
  assert.match(migration,/administrator role required for assessment finalization/);
  assert.doesNotMatch(migration,/join public\.client_assignments ca/);
  assert.match(migration,/assessment is missing required measurements/);
  assert.match(migration,/assessment is missing required photos/);
  assert.match(migration,/snapshot configuration must match active version/);
  assert.match(migration,/assessment finalization lost its draft state/);
  assert.match(migration,/REVOKE EXECUTE ON FUNCTION public\.finalize_assessment_from_method_snapshot/);
  assert.match(migration,/FROM PUBLIC, anon, authenticated/);
  assert.match(migration,/TO service_role/);
  assert.match(persist,/await requireRole\("admin"\)/);
  assert.match(persist,/context\.profileId !== input\.finalizedByProfileId/);
  assert.match(persist,/createAdminClient\(\)/);
  assert.match(adminActions,/await requireRole\("admin"\)/);
  assert.match(createAction,/await requireRole\("admin"\)/);
});

test("database regression covers AAL2, AAL1, forged authors, historical photos and finalization",()=>{
  assert.match(workflow,/Run admin global historical assessment lifecycle pgTAP/);
  assert.match(workflow,/supabase\/tests\/database\/admin_global_assessment_lifecycle\.test\.sql/);
  for(const phrase of [
    "Unassigned admin AAL2 can start historical assessment draft",
    "Unassigned admin AAL2 can update historical draft",
    "Unassigned admin AAL2 can link same-client photo while draft",
    "Admin cannot forge assessment draft author",
    "AAL1 admin cannot start draft",
    "Client cannot insert another Client assessment",
    "Service-only finalization rejects a forged non-admin actor",
    "Service-only finalization accepts verified admin without assignment after readiness checks",
    "Exactly two immutable versioned method snapshots persist"
  ]) assert.ok(pgtap.includes(phrase),phrase);
});
