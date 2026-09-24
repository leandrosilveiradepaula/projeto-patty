import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260924141700_anamnesis_final_submission_foundation.sql",
);

function loadMigration() {
  return readFileSync(migrationPath, "utf8");
}

test("final submission grants only submitted_at update to authenticated", () => {
  const sql = loadMigration();

  assert.match(
    sql,
    /grant update \(submitted_at\)\s+on table public\.anamnesis_submissions\s+to authenticated;/i,
  );
  assert.doesNotMatch(
    sql,
    /grant update\s+on table public\.anamnesis_submissions/i,
  );
});

test("final submission policy is ownership-scoped with using and with check", () => {
  const sql = loadMigration();

  assert.match(
    sql,
    /create policy "anamnesis_submissions_update_own_draft_for_final_submit"/,
  );
  assert.match(sql, /for update\s+to authenticated\s+using \(/i);
  assert.match(sql, /with check \(/i);
  assert.match(sql, /clients\.profile_id = \(select auth\.uid\(\)\)/i);
});

test("final submission validation stays invoker-context and closed to direct execute", () => {
  const sql = loadMigration();

  assert.match(
    sql,
    /create function public\.validate_anamnesis_submission_before_final_submit\(\)/i,
  );
  assert.doesNotMatch(sql, /security definer/i);
  assert.match(
    sql,
    /revoke execute on function public\.validate_anamnesis_submission_before_final_submit\(\)\s+from public, anon, authenticated;/i,
  );
});

test("final submission trigger validates applicability and normalizes submitted_at", () => {
  const sql = loadMigration();

  assert.match(sql, /with recursive question_state as \(/i);
  assert.match(sql, /anamnesis applicability graph is invalid/i);
  assert.match(
    sql,
    /anamnesis submission has missing or invalid required answers/i,
  );
  assert.match(sql, /new\.submitted_at := statement_timestamp\(\);/i);
  assert.match(
    sql,
    /before update of submitted_at on public\.anamnesis_submissions/i,
  );
});
