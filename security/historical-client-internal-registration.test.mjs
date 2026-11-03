import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/migrations/20261103011500_historical_client_internal_registration.sql","utf8");
const action = readFileSync("app/admin/clientes/historico/actions.ts","utf8");
const boundary = readFileSync("lib/onboarding/historical-client-registration.ts","utf8");
const page = readFileSync("app/admin/clientes/historico/page.tsx","utf8");
const form = readFileSync("components/admin/HistoricalClientRegistrationForm.tsx","utf8");
const workflow = readFileSync(".github/workflows/validate-method-configuration-foundation.yml","utf8");
const pgtap = readFileSync("supabase/tests/database/historical_client_internal_registration.test.sql","utf8");

test("historical Client creation is atomic and isolated from Auth, assignments and publication",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.create_historical_client_internal/);
  assert.match(sql,/SECURITY DEFINER/);
  assert.match(sql,/SET search_path = pg_catalog/);
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/auth\.jwt\(\) ->> 'aal'/);
  assert.match(sql,/r\.role = 'admin'/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/p_confirmed_no_existing_client IS DISTINCT FROM true/);
  assert.match(sql,/INSERT INTO public\.clients\(full_name, profile_id, status, started_at, ended_at\)/);
  assert.match(sql,/VALUES \(v_name, NULL, 'inactive', NULL, NULL\)/);
  assert.match(sql,/created_by_profile_id/);
  assert.match(sql,/REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION.*TO authenticated/);
  assert.doesNotMatch(sql,/GRANT\s+INSERT\s+ON\s+public\.clients\s+TO\s+authenticated/i);
  assert.doesNotMatch(sql,/auth\.admin\.|client_assignments|protocol_publications|storage\.objects/i);
});

test("admin session is rechecked and browser receives no service-role client",()=>{
  assert.match(action,/await requireRole\("admin"\)/);
  assert.match(action,/duplicateReviewConfirmed: true/);
  assert.match(boundary,/await requireRole\("admin"\)/);
  assert.match(boundary,/await createClient\(\)/);
  assert.match(boundary,/\.rpc\("create_historical_client_internal"/);
  assert.doesNotMatch(action+boundary,/createAdminClient|service_role|inviteUserByEmail|generateLink/);
  assert.match(page,/await requireRole\("admin"\)/);
  assert.match(form,/confirmedNoExistingClient/);
  assert.match(form,/crypto\.randomUUID\(\)/);
  assert.match(form,/Criar cadastro histórico inativo/);
});

test("database regression is registered and exercises rejection cases",()=>{
  assert.match(workflow,/Run historical internal Client registration pgTAP/);
  for(const phrase of ["Unassigned admin AAL2 creates historical client","Client remains inactive without Auth or assignment","Retry returns same Client id","Exact name collision requires manual review","Admin AAL1 denied","Client AAL2 denied"]){
    assert.ok(pgtap.includes(phrase),phrase);
  }
});
