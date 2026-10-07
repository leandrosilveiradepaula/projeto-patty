import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client schema hardening enforces canonical name and lifecycle status", () => {
  const migration = read(
    "supabase/migrations/20261007133000_enforce_client_name_and_status.sql",
  );

  assert.match(migration, /add column full_name text/);
  assert.match(migration, /alter column full_name set not null/);
  assert.match(migration, /clients_full_name_valid/);
  assert.match(migration, /clients_status_valid/);
  assert.match(migration, /status in \('active', 'inactive'\)/);
  assert.match(migration, /app_private\.enforce_client_full_name/);
  assert.match(migration, /app_private\.sync_client_full_name_from_profile/);
  assert.match(migration, /app_private\.sync_client_status_from_assignments/);
  assert.match(migration, /revoke all on function .* from anon/);
  assert.match(migration, /revoke all on function .* from authenticated/);
});

test("client database types expose canonical full_name", () => {
  const types = read("lib/supabase/database.types.ts");

  const clientsStart = types.indexOf("      clients: {");
  const clientsEnd = types.indexOf("      educational_content_assets:", clientsStart);
  const clients = types.slice(clientsStart, clientsEnd);

  assert.match(clients, /full_name: string/);
  assert.match(clients, /full_name\?: string/);
});
