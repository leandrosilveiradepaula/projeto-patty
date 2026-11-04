import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const helper = read("lib/onboarding/historical-client-return-request.ts");
const action = read("app/admin/clientes/[clienteId]/actions.ts");
const page = read("app/admin/clientes/[clienteId]/page.tsx");
const form = read("components/admin/HistoricalClientReturnRequestForm.tsx");
const migration = read("supabase/migrations/20261104013000_historical_client_return_request.sql");

test("the privileged request requires admin AAL2 and exact opaque identity confirmation", () => {
  assert.match(helper, /import "server-only"/);
  assert.match(helper, /await requireRole\("admin"\)/);
  assert.match(helper, /input.confirmedClientId !== input.clientId/);
  assert.match(helper, /input.humanIdentityReviewDeclared !== true/);
  assert.ok(helper.indexOf('await requireRole("admin")') < helper.indexOf("createAdminClient()"));
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(action, /formData.getAll\("confirmedClientId"\)/);
  assert.match(action, /formData.getAll\("identityReviewedByHuman"\)/);
  assert.match(form, /crypto.randomUUID\(\)/);
  assert.match(form, /value="yes"/);
  assert.match(form, /Cadastrar|Registrar solicitação de retorno/);
});

test("records only an audit request: no Auth, linked Profile, assignments or historical releases", () => {
  assert.match(page, /client.status === "inactive" && !client.profile_id/);
  assert.match(page, /<HistoricalClientReturnRequestForm clientId=\{client.id\} \/>/);
  assert.match(helper, /register_historical_client_return_request/);
  assert.doesNotMatch(helper + action.slice(action.indexOf("export async function registerHistoricalClientReturnRequestAction")),
    /auth\.admin|updateUser|startCurrentAdminClientAssignment|insert\(\{.*profile_id|deleteUser/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /current_user <> 'service_role'/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]+FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]+TO service_role/);
  assert.doesNotMatch(migration, /UPDATE public\.clients|INSERT INTO public\.clients|INSERT INTO public\.client_assignments|UPDATE auth\.users/);
});
