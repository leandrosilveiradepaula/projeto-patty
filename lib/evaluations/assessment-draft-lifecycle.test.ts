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
    "20260927001500_create_assessment_draft_lifecycle.sql",
  ),
  "utf8",
);
const mfaMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20260923113835_admin_mfa_rls_enforcement.sql",
  ),
  "utf8",
);

test("assessment lifecycle preserves legacy rows as finalized and new drafts as explicit", () => {
  assert.match(migration, /add column assessment_kind text/i);
  assert.match(migration, /add column finalized_at timestamptz/i);
  assert.match(migration, /update public\.client_assessments\s+set finalized_at = created_at/i);
  assert.match(migration, /assessment_kind in \('fortnightly', 'monthly'\)/i);
  assert.match(migration, /finalized assessment is immutable/i);
});

test("assessment draft writes remain admin assignment scoped and MFA protected", () => {
  assert.match(migration, /user_roles\.role = 'admin'/i);
  assert.match(migration, /client_assignments\.ended_at is null/i);
  assert.match(migration, /created_by_profile_id = \(select auth\.uid\(\)\)/i);
  assert.match(
    mfaMigration,
    /'assessment_files',[\s\S]*'assessment_measurements',[\s\S]*'client_assessments'/i,
  );
});

test("assessment browser grants allow draft editing without assessment hard delete", () => {
  assert.match(
    migration,
    /grant select, insert, update on table public\.client_assessments to authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /grant[^;]*delete[^;]*public\.client_assessments/i,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.assessment_measurements to authenticated/i,
  );
  assert.match(
    migration,
    /grant select, insert, delete on table public\.assessment_files to authenticated/i,
  );
});

test("measurements and photo links can mutate only while the assessment is draft", () => {
  assert.match(migration, /assessment content can change only while draft/i);
  assert.match(migration, /assessment_measurements_draft_guard/i);
  assert.match(migration, /assessment_files_draft_guard/i);
  assert.match(migration, /ca\.finalized_at is null/i);
});
