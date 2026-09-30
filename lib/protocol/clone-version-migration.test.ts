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
    "20260927014500_clone_protocol_version_draft.sql",
  ),
  "utf8",
);

test("protocol clone RPC stays security-invoker and authenticated-only", () => {
  assert.match(migration, /security invoker/i);
  assert.match(
    migration,
    /revoke all on function public\.clone_protocol_version_draft\(uuid, jsonb\)\s+from public, anon/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.clone_protocol_version_draft\(uuid, jsonb\)\s+to authenticated/i,
  );
  assert.doesNotMatch(migration, /security definer/i);
});

test("protocol clone RPC creates a draft derived from a frozen source", () => {
  assert.match(migration, /submitted_for_review_at is null/i);
  assert.match(migration, /source protocol version must be frozen before cloning/i);
  assert.match(migration, /based_on_version_id/i);
  assert.match(migration, /\(select auth\.uid\(\)\)/i);
  assert.match(migration, /coalesce\(max\(version_number\), 0\) \+ 1/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
});

test("protocol clone RPC copies only versioned plan content", () => {
  for (const table of [
    "meal_plan_versions",
    "meal_plan_variants",
    "meals",
    "meal_dose_allocations",
    "meal_plan_cycles",
    "meal_plan_cycle_steps",
  ]) {
    assert.match(migration, new RegExp(`public\\.${table}`, "i"));
  }

  assert.doesNotMatch(
    migration,
    /insert into public\.protocol_version_approvals/i,
  );
  assert.doesNotMatch(
    migration,
    /insert into public\.protocol_publications/i,
  );
});


test("protocol clone RPC accepts only the server snapshot contract", () => {
  assert.match(migration, /p_plan_snapshot jsonb/i);
  assert.match(
    migration,
    /protocol plan snapshot must be a JSON object/i,
  );
  assert.match(migration, /jsonb_array_elements/i);
  assert.doesNotMatch(
    migration,
    /from public\.meals source_meal/i,
    "RPC must not reread source meal rows while writing the clone.",
  );
});
