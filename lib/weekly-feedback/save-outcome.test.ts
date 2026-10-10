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
  assert.match(data, /export async function updateCurrentClientWeeklyFeedback[\s\S]*?\.is\("submitted_at", null\)[\s\S]*?\.maybeSingle\(\)/);
});

test("client page never reports success for a no-row save", () => {
  const action = read("app/cliente/feedback-semanal/actions.ts");
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.match(action, /outcome: "conflict"/);
  assert.match(action, /Nenhuma nova gravação foi confirmada/);
  assert.match(form, /state.outcome === "conflict"/);
});
