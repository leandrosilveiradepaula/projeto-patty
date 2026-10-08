import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseProtocolDraftDoseQuantity } from "./dose-entry.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

test("preserves editable fractional doses with database-supported precision", () => {
  for (const [input, expected] of [
    ["1", 1], ["0.5", 0.5], ["0,5", 0.5], [".25", 0.25],
    [",25", 0.25], [" 3.0001 ", 3.0001], ["0.0001", 0.0001],
    ["999", 999], ["999.0000", 999], ["0002.5000", 2.5],
  ] as const) {
    assert.equal(parseProtocolDraftDoseQuantity(input), expected, input);
  }
});

test("rejects coercions, ambiguous formats, invalid numbers and excessive precision", () => {
  const invalidInputs = [
    null, ""," ","0","-1","+1","-0.5","1000", "999.0001",
    "1e2", "1E2", "0x10", "Infinity", "NaN",
    "1abc", "1,2,3", "1.2.3", "1 2",
    "0.00001", "1.23456", "0,12345", "999.9999",
    "1.", "1,", ".", ",",
  ];
  for (const input of invalidInputs) {
    assert.equal(parseProtocolDraftDoseQuantity(input), null, String(input));
  }
  const file = new File(["unsafe"], "example.txt");
  assert.equal(parseProtocolDraftDoseQuantity(file), null);
});

test("both server actions validate before any protocol mutation", () => {
  const actions = read("app/admin/protocolos/[protocoloId]/actions.ts");
  const create = actions.slice(actions.indexOf("export async function addProtocolMealDose("), actions.indexOf("export async function updateProtocolMealPlanVariantLabel("));
  const update = actions.slice(actions.indexOf("export async function updateProtocolMealDose("), actions.indexOf("export async function removeProtocolMealDose("));
  for (const source of [create, update]) {
    assert.match(source, /parseProtocolDraftDoseQuantity\(quantityValue\)/);
    assert.match(source, /doseQuantity === null/);
    assert.doesNotMatch(source, /Number\(quantityValue\.replace/);
  }
});

test("the editor describes allowed fractional precision in both contexts", () => {
  const editor = read("components/admin/AdminProtocolDraftEditor.tsx");
  assert.match(editor, /Aceita doses fracionadas com até quatro casas decimais/);
  assert.match(editor, /Até quatro casas decimais/);
  assert.equal((editor.match(/max="999"/g) ?? []).length, 2);
});
