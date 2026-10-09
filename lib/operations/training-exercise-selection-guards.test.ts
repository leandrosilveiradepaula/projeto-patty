import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/clientes/[clienteId]/treino/actions.ts", import.meta.url), "utf8");
const add = source.slice(source.indexOf("export async function addTrainingPlanItemAction"), source.indexOf("export async function updateTrainingPlanItemAction"));
const edit = source.slice(source.indexOf("export async function updateTrainingPlanItemAction"), source.indexOf("export async function deleteTrainingPlanItemAction"));

test("adding and editing training items reject malformed selected exercise version IDs", () => {
  for (const action of [add, edit]) {
    assert.match(action, /exerciseVersionRaw\.trim\(\) && !isUuid\(exerciseVersionRaw\)/);
    assert.match(action, /return initialError\("A versão do exercício selecionado é inválida\."\)/);
  }
});

test("both training item mutations reject published exercise versions without a name", () => {
  for (const action of [add, edit]) {
    assert.match(action, /exerciseName = exerciseVersion\.name\.trim\(\)/);
    assert.match(action, /if \(!exerciseName\)/);
  }
});

test("training item creation validates repetitions, sets, rest and execution notes before position lookup", () => {
  const lookup = add.indexOf("await listAccessibleClientTrainingPlanItems(version.id)");
  for (const name of ["executionNotes", "repetitionsText", "restText", "setsText"]) {
    assert.ok(add.indexOf("const " + name + " = ") >= 0);
    assert.ok(add.indexOf("const " + name + " = ") < lookup);
  }
});
