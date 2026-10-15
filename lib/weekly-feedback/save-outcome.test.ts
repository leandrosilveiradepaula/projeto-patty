import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("weekly feedback saving requires an explicit save or submit intent", () => {
  const actions = read("app/cliente/feedback-semanal/actions.ts");
  assert.match(actions, /intent !== "save" && intent !== "submit"/);
  assert.match(actions, /outcome: "invalid"/);
});

test("weekly feedback refuses stale submissions and only confirms persisted updates", () => {
  const actions = read("app/cliente/feedback-semanal/actions.ts");
  const data = read("lib/supabase/data-access.ts");

  assert.match(actions, /if \(!feedback \|\| feedback\.submitted_at\)/);
  assert.match(actions, /outcome: "conflict"/);
  assert.match(actions, /saved = await updateCurrentClientWeeklyFeedback/);
  assert.match(actions, /if \(!saved\)/);
  const start = data.indexOf("export async function updateCurrentClientWeeklyFeedback(");
  const end = data.indexOf("\nexport ", start + 30);
  const writer = data.slice(start, end);
  const sql = read("supabase/migrations/20261015171900_private_weekly_feedback_atomic_save.sql");
  assert.ok(start >= 0 && end > start);
  // The last-mile CAS now runs atomically in the invoker SQL function, not
  // through a PostgREST GET/URL query leaking private answer snapshots.
  assert.match(writer, /supabase\.rpc\(\s*"save_client_weekly_feedback_if_unchanged"/);
  assert.match(writer, /p_expected_answers: input\.expectedAnswers/);
  assert.match(writer, /p_answers: input\.answers/);
  assert.match(writer, /return data\?\.\[0\] \?\? null/);
  assert.doesNotMatch(writer, /\.filter\("answers"/);
  assert.match(sql, /feedback\.submitted_at is null/);
  assert.match(sql, /feedback\.answers = p_expected_answers/);
  assert.match(sql, /security invoker/);
});

test("client page never reports success for a no-row save", () => {
  const action = read("app/cliente/feedback-semanal/actions.ts");
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.match(action, /outcome: "conflict"/);
  assert.match(action, /Nenhuma nova gravação foi confirmada/);
  assert.match(form, /state.outcome === "conflict"/);
});
