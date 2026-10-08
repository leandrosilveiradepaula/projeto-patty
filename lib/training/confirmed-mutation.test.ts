import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { requireConfirmedTrainingMutation } from "./confirmed-mutation.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const access = fs.readFileSync(path.join(root, "lib/supabase/data-access.ts"), "utf8");

function functionSource(name: string): string {
  const start = access.indexOf("export async function " + name + "(");
  assert.notEqual(start, -1, name + " must exist");
  const next = access.indexOf("export async function ", start + 1);
  return access.slice(start, next < 0 ? undefined : next);
}

test("zero-row training edits cannot be acknowledged as saved", () => {
  assert.throws(
    () => requireConfirmedTrainingMutation(null),
    /não foi confirmada/,
  );
  assert.doesNotThrow(() => requireConfirmedTrainingMutation({ id: "synthetic-id" }));
});

test("draft changes confirm a returned row and retain the unreviewed guard", () => {
  const code = functionSource("updateAccessibleClientTrainingPlanDraft");
  assert.match(code, /\.is\("reviewed_at", null\)/);
  assert.match(code, /\.is\("published_at", null\)/);
  assert.match(code, /\.select\("id"\)\s*\.maybeSingle\(\)/);
  assert.match(code, /requireConfirmedTrainingMutation\(data\)/);
});

test("exercise edit and remove confirm row changes, never just absence of error", () => {
  for (const name of ["updateAccessibleClientTrainingPlanItem", "deleteAccessibleClientTrainingPlanItem"]) {
    const code = functionSource(name);
    assert.match(code, /\.select\("id"\)\s*\.maybeSingle\(\)/);
    assert.match(code, /requireConfirmedTrainingMutation\(data\)/);
  }
});
