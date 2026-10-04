import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readMigration(name: string) {
  return fs.readFileSync(
    path.join(root, "supabase", "migrations", name),
    "utf8",
  );
}

const initial = readMigration(
  "20261004132649_allow_client_finalized_assessment_read.sql",
);
const effective = readMigration(
  "20261004132902_secure_client_assessment_effective_read.sql",
);
const privateReader = readMigration(
  "20261004132955_move_client_assessment_reader_to_private_schema.sql",
);

test("initial direct correction read is superseded by the effective-value RPC", () => {
  assert.match(
    initial,
    /assessment_measurement_corrections_select_own_finalized/i,
  );
  assert.match(
    effective,
    /drop policy if exists "assessment_measurement_corrections_select_own_finalized"/i,
  );
  assert.match(
    effective,
    /list_current_client_finalized_assessment_measurements/i,
  );
});

test("effective assessment reader keeps the definer in a non-exposed schema", () => {
  assert.match(privateReader, /create schema if not exists app_private/i);
  assert.match(
    privateReader,
    /create function app_private\.list_current_client_finalized_assessment_measurements\(\)/i,
  );
  assert.match(privateReader, /security definer/i);
  assert.match(
    privateReader,
    /where c\.profile_id = \(select auth\.uid\(\)\)/i,
  );
  assert.match(
    privateReader,
    /create function public\.list_current_client_finalized_assessment_measurements\(\)/i,
  );
  assert.match(privateReader, /security invoker/i);
  assert.match(
    privateReader,
    /revoke execute on function public\.list_current_client_finalized_assessment_measurements\(\)\s+from public, anon/i,
  );
  assert.match(
    privateReader,
    /grant execute on function public\.list_current_client_finalized_assessment_measurements\(\)\s+to authenticated/i,
  );
});

test("client assessment reader returns only effective factual measurement columns", () => {
  assert.match(
    privateReader,
    /coalesce\(latest\.corrected_measurement_value, am\.measurement_value\)/i,
  );
  assert.match(
    privateReader,
    /coalesce\(latest\.corrected_unit, am\.unit\)/i,
  );
  assert.doesNotMatch(
    privateReader.slice(
      privateReader.indexOf("create function public."),
    ),
    /note|corrected_by_profile_id/i,
  );
});
