import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("check-in correction migration preserves append-only history and least privilege", () => {
  const migration = read(
    "supabase/migrations/20261007173100_create_client_checkin_corrections.sql",
  );

  assert.match(migration, /client_liquid_intake_event_corrections/);
  assert.match(migration, /client_activity_checkin_event_corrections/);
  assert.match(migration, /reject_client_checkin_history_mutation/);
  assert.match(
    migration,
    /grant select, insert on table public\.client_liquid_intake_event_corrections to authenticated/,
  );
  assert.match(
    migration,
    /grant select, insert on table public\.client_activity_checkin_event_corrections to authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant[^;]*(update|delete)[^;]*client_(liquid_intake|activity_checkin)_event_corrections/i,
  );
  assert.match(migration, /assignment\.ended_at is null/);
  assert.match(migration, /current_user_admin_mfa_satisfied/);
});
