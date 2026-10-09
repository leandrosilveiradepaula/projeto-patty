import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/clientes/[clienteId]/treino/actions.ts", import.meta.url), "utf8");
const add = source.slice(source.indexOf("export async function addTrainingPlanItemAction"), source.indexOf("export async function updateTrainingPlanItemAction"));
const edit = source.slice(source.indexOf("export async function updateTrainingPlanItemAction"), source.indexOf("export async function deleteTrainingPlanItemAction"));

test("optional training fields reject non-string values instead of silently treating files as empty", () => {
  const helper = source.slice(source.indexOf("function optionalText("), source.indexOf("async function requireAccessibleTrainingContext"));
  assert.match(helper, /if \(value === null\)/);
  assert.match(helper, /throw new Error/);
});

test("adding and editing exercise selections reject non-text form values", () => {
  for (const action of [add, edit]) {
    assert.match(action, /exerciseVersionRaw !== null && typeof exerciseVersionRaw !== "string"/);
  }
});

test("both training item mutations validate every input before persistence", () => {
  for (const action of [add, edit]) {
    const write = action.indexOf("await " + (action === add ? "createAccessibleClientTrainingPlanItem" : "updateAccessibleClientTrainingPlanItem") + "({");
    assert.ok(write > 0);
    for (const name of ["executionNotes", "repetitionsText", "restText", "setsText"]) {
      assert.ok(action.indexOf("const " + name + " = ") < write, name);
      assert.ok(action.indexOf("const " + name + " = ") >= 0, name);
    }
  }
});

test("training item insertion guards against unsafe position values", () => {
  assert.match(add, /!Number\.isSafeInteger\(nextPosition\) \|\| nextPosition < 1/);
});
