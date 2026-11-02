import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20261102151000_admin_global_checkin_corrections_insert.sql","utf8");
const pgtap = readFileSync("supabase/tests/database/admin_global_checkin_corrections.test.sql","utf8");
const workflow = readFileSync(".github/workflows/validate-method-configuration-foundation.yml","utf8");
const action = readFileSync("app/admin/clientes/[clienteId]/checkins/actions.ts","utf8");

test("two historical check-in policies are append-only, admin AAL2, actor-bound and event-bound", () => {
  const sql = migration.replace(/^--.*$/gm,"");
  for (const kind of ["client_liquid_intake_event_corrections","client_activity_checkin_event_corrections"]) {
    assert.match(sql,new RegExp("CREATE POLICY "+kind+"_insert_admin_global_aal2"));
    assert.match(sql,new RegExp("ON public\\."+kind+"\\s+FOR INSERT TO authenticated"));
    assert.match(sql,/tgname = target \|\| '_immutable'/);
  }
  assert.match(sql,/corrected_by_profile_id = \(SELECT auth\.uid\(\)\)/g);
  assert.match(sql,/ur\.role = 'admin'/g);
  assert.match(sql,/auth\.jwt\(\) ->> 'aal'/g);
  assert.match(sql,/admin_global_select_aal2/);
  assert.match(sql,/admin_mfa_aal2_required/);
  assert.match(sql,/has_table_privilege\('anon'/);
  assert.doesNotMatch(sql,/\b(?:DROP|ALTER|GRANT|REVOKE|UPDATE|DELETE)\s+(?:POLICY|TABLE|ON|public\.)/i);
  assert.doesNotMatch(sql,/CREATE POLICY[^;]+FOR (?:ALL|SELECT|UPDATE|DELETE)\b/i);
});

test("existing check-in server actions retain client scope, MFA, author and optimistic snapshot", () => {
  assert.match(action,/await requireRole\("admin"\)/g);
  assert.match(action,/getAccessibleClient\(clientId\)/g);
  assert.match(action,/getAccessibleClientLiquidIntakeEvent\(client\.id, eventId\)/);
  assert.match(action,/getAccessibleClientActivityCheckinEvent\(client\.id, eventId\)/);
  assert.match(action,/checkinCorrectionSnapshotMatches\(expected\.id, latest\)/g);
  assert.match(action,/correctedByProfileId: auth\.profileId/g);
  assert.doesNotMatch(action,/createAdminClient|service_role|startCurrentAdminClientAssignment/);
});

test("disposable pgTAP covers AAL2, client owner, denials and immutable source", () => {
  assert.match(workflow,/Run admin global check-in correction pgTAP/);
  for (const phrase of [
    "Unassigned AAL2 admin corrects historical liquid event",
    "Unassigned AAL2 admin corrects historical activity event",
    "Admin AAL1 cannot correct historical activity",
    "Admin cannot forge another correction author",
    "Client retains own liquid correction access",
    "Client retains own activity correction access",
    "Client cannot correct unrelated historical liquid event",
    "Client cannot correct unrelated historical activity event",
    "Non-admin cannot correct historical liquid",
    "Non-admin cannot correct historical activity",
    "Original liquid event is unchanged",
    "Original activity event is unchanged",
    "Append-only and anonymous privilege boundary preserved",
  ]) assert.ok(pgtap.includes(phrase),phrase);
});
