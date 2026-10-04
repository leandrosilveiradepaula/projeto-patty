import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20260926233725_create_client_training_requests.sql",
  ),
  "utf8",
);
const optimizationMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20260926233849_optimize_client_training_request_rls.sql",
  ),
  "utf8",
);

test("training request history is append-only and browser writes are minimal", () => {
  assert.match(migration, /create table public\.client_training_requests/i);
  assert.match(migration, /enable row level security/i);
  assert.match(
    migration,
    /grant select, insert on table public\.client_training_requests to authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /grant[^;]*(update|delete)[^;]*client_training_requests/i,
  );
  assert.match(migration, /before update or delete/i);
  assert.match(migration, /append-only/i);
});

test("training request access requires admin, active assignment and aal2", () => {
  assert.match(migration, /current_user_admin_mfa_satisfied/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'\) = 'aal2'/i);
  assert.match(migration, /user_roles\.role = 'admin'/i);
  assert.match(migration, /client_assignments\.ended_at is null/i);
  assert.match(migration, /recorded_by_profile_id = \(select auth\.uid\(\)\)/i);
});


test("training request RLS optimization relies on the restrictive MFA policy", () => {
  assert.match(migration, /create policy admin_mfa_aal2_required/i);
  assert.doesNotMatch(optimizationMigration, /auth\.jwt\(\)/i);
  assert.match(
    optimizationMigration,
    /user_roles\.profile_id = \(select auth\.uid\(\)\)/i,
  );
  assert.match(
    optimizationMigration,
    /client_assignments\.ended_at is null/i,
  );
});

const selfServiceMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261004132337_allow_client_training_request_self_service.sql",
  ),
  "utf8",
);

test("client training request self service is own-client only and append-only", () => {
  assert.match(
    selfServiceMigration,
    /create policy "client_training_requests_select_own_client"/i,
  );
  assert.match(
    selfServiceMigration,
    /create policy "client_training_requests_insert_own_client"/i,
  );
  assert.match(
    selfServiceMigration,
    /clients\.profile_id = \(select auth\.uid\(\)\)/i,
  );
  assert.match(
    selfServiceMigration,
    /recorded_by_profile_id = \(select auth\.uid\(\)\)/i,
  );
  assert.doesNotMatch(selfServiceMigration, /for update|for delete/i);
});
