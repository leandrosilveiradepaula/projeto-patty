import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261011063500_replace_draft_meal_plan_cycle_steps.sql"),
  "utf8",
);

test("cycle replacement remains invoker-only with normal RLS and no client shortcut", () => {
  assert.match(sql, /security invoker/i);
  assert.doesNotMatch(sql, /security definer|disable row level security|bypassrls/i);
  assert.match(sql, /revoke all on function public\.replace_draft_meal_plan_cycle_steps\(uuid, uuid, jsonb, uuid\[\]\)\s+from public, anon/i);
  assert.match(sql, /grant execute on function public\.replace_draft_meal_plan_cycle_steps\(uuid, uuid, jsonb, uuid\[\]\)\s+to authenticated/i);
});

test("cycle replacement locks review boundary and checks complete optimistic snapshot", () => {
  assert.match(sql, /for update of pv/i);
  assert.match(sql, /v_submitted_at is not null/i);
  assert.match(sql, /for update;/i);
  assert.match(sql, /v_actual_steps <> p_expected_steps/i);
  assert.match(sql, /cycle_steps_changed/i);
  assert.match(sql, /v\.meal_plan_version_id = p_meal_plan_version_id/i);
});

test("cycle replacement is one transactional ordered rewrite, not a protocol publication", () => {
  assert.match(sql, /delete from public\.meal_plan_cycle_steps/i);
  assert.match(sql, /insert into public\.meal_plan_cycle_steps/i);
  assert.match(sql, /with ordinality/i);
  assert.doesNotMatch(sql, /insert into public\.(protocol_publications|protocol_version_approvals)/i);
  assert.doesNotMatch(sql, /low|high|cutting/i);
});
