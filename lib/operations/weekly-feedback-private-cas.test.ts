import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

const access = read("lib/supabase/data-access.ts");
const start = access.indexOf("export async function updateCurrentClientWeeklyFeedback(");
const end = access.indexOf("\nexport ", start + 50);
const save = access.slice(start, end);
const sql = read("supabase/migrations/20261015171900_private_weekly_feedback_atomic_save.sql");

test("client writes weekly health answers through authenticated POST RPC, never URL filters", () => {
  assert.ok(start > 0 && end > start);
  assert.match(save, /supabase\.rpc\(\s*"save_client_weekly_feedback_if_unchanged"/);
  assert.match(save, /p_expected_answers: input\.expectedAnswers/);
  assert.match(save, /p_answers: input\.answers/);
  assert.match(save, /p_submit: input\.submit/);
  assert.doesNotMatch(save, /\.filter\("answers"/);
  assert.doesNotMatch(save, /JSON\.stringify\(input\.expectedAnswers\)/);
  assert.doesNotMatch(save, /createAdminClient\(/);
  assert.match(save, /return data\?\.\[0\] \?\? null/);
});

test("database performs single atomic compare-and-swap, with client ownership and RLS", () => {
  assert.match(sql, /security invoker/i);
  assert.match(sql, /update public\.client_weekly_feedbacks as feedback/i);
  assert.match(sql, /feedback\.answers = p_expected_answers/);
  assert.match(sql, /feedback\.submitted_at is null/);
  assert.match(sql, /feedback\.id = p_feedback_id/);
  assert.match(sql, /feedback\.client_id = p_client_id/);
  assert.match(sql, /client\.profile_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /returning feedback\.\*/);
  assert.doesNotMatch(sql, /security definer/i);
  assert.doesNotMatch(sql, /service_role|disable row level security/i);
});

test("anonymous cannot invoke the mutation and submitted feedback stays immutable", () => {
  assert.match(sql, /revoke all on function public\.save_client_weekly_feedback_if_unchanged\(/);
  assert.match(sql, /from public, anon/);
  assert.match(sql, /to authenticated/);
  const server = read("app/cliente/feedback-semanal/actions.ts");
  assert.match(server, /requireRole\("client"\)/);
  assert.match(server, /fingerprintWeeklyFeedbackAnswers\(feedback\.answers\)/);
  assert.match(server, /if \(!saved\)/);
  assert.match(server, /updateCurrentClientWeeklyFeedback\(\{/);
});
