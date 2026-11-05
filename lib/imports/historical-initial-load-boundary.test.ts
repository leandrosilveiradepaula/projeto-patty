import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = (p: string) => readFileSync(path.join(root, p), "utf8");
const api = file("app/api/admin/imports/initial-load/route.ts");
const server = file("lib/imports/historical-initial-load-server.ts");
const sql = file("supabase/migrations/20261105043500_historical_initial_load_ledger.sql");
const workflow = file(".github/workflows/validate-method-configuration-foundation.yml");

test("initial-load API requires admin+AAL2 before reading untrusted input", () => {
  const auth = api.indexOf('await requireRole("admin")');
  const parse = api.indexOf("readJsonBounded(request)");
  assert.ok(auth >= 0 && parse > auth);
  assert.match(api, /isSameOrigin\(request\)/);
  assert.match(api, /MAX_BODY_BYTES = 1024 \* 1024/);
  assert.match(api, /reader\.read\(\)/);
  assert.match(api, /"Cache-Control": "private, no-store/);
  assert.doesNotMatch(api, /console\.|\.insert\(|\.upsert\(|\.update\(|\.storage\./);
});

test("server-only service_role call cannot approve or import any domain data", () => {
  assert.match(server, /import "server-only"/);
  assert.match(server, /await requireRole\("admin"\)/);
  assert.match(server, /prepareHistoricalInitialLoadRegistration/);
  assert.match(server, /register_historical_initial_load_manifest/);
  assert.doesNotMatch(server, /console\.|\.from\("clients"\)|\.from\("anamnesis_submissions"\)|\.storage\./);
});

test("schema is append-only, RLS protected and gated from the browser", () => {
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(sql, /REVOKE ALL ON public\.historical_initial_load_batches FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON public\.historical_initial_load_sources FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /SECURITY INVOKER/);
  assert.match(sql, /current_user <> 'service_role'/);
  assert.match(sql, /auth\.jwt\(\) ->> 'aal'/);
  assert.match(sql, /'aal2'/);
  assert.match(sql, /manifest_metadata = p_sources/);
  assert.doesNotMatch(sql, /CREATE POLICY.*FOR (INSERT|UPDATE|DELETE) TO authenticated/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE TABLE|DELETE FROM public\./);
});

test("ledger pgTAP runs against disposable Supabase CI", () => {
  assert.match(workflow, /supabase test db supabase\/tests\/database\/historical_initial_load_ledger\.test\.sql/);
});
