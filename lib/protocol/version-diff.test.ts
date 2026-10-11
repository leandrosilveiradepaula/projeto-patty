import assert from "node:assert/strict";
import test from "node:test";

import { buildProtocolPlanComparison } from "./version-diff.ts";

test("protocol plan comparison reports factual structure and dose totals", () => {
  const rows = buildProtocolPlanComparison(
    {
      cycles: [{ steps: [{ position: 1, variantKey: "a" }, { position: 2, variantKey: "a" }] }],
      variants: [
        {
          label: "A", variantKey: "a",
          meals: [
            {
              label: "Primeira", position: 1,
              doseAllocations: [
                { doseQuantity: 2, doseType: "protein" },
                { doseQuantity: 1.5, doseType: "carbohydrate" },
              ],
            },
            {
              label: "Segunda", position: 2,
              doseAllocations: [
                { doseQuantity: 1, doseType: "protein" },
              ],
            },
          ],
        },
      ],
    },
    {
      cycles: [],
      variants: [
        {
          label: "A", variantKey: "a",
          meals: [
            {
              label: "Primeira", position: 1,
              doseAllocations: [
                { doseQuantity: 2, doseType: "protein" },
                { doseQuantity: 2, doseType: "carbohydrate" },
              ],
            },
          ],
        },
      ],
    },
  );

  assert.deepEqual(rows, [
    { label: "Variantes", baseValue: "1", currentValue: "1" },
    { label: "Refeições", baseValue: "1", currentValue: "2" },
    { label: "Alocações de dose", baseValue: "2", currentValue: "3" },
    { label: "Ciclos", baseValue: "0", currentValue: "1" },
    { label: "Passos de ciclo", baseValue: "0", currentValue: "2" },
    { label: "Ordem e variações dos ciclos", baseValue: "Nenhum ciclo", currentValue: "Ciclo 1: 1. A → 2. A" },
    { label: "Total de doses · carbohydrate", baseValue: "2", currentValue: "1.5" },
    { label: "Total de doses · protein", baseValue: "2", currentValue: "3" },
  ]);
});

test("protocol plan comparison treats absent plans as zero structure", () => {
  const rows = buildProtocolPlanComparison(null, null);

  assert.deepEqual(rows, [
    { label: "Variantes", baseValue: "0", currentValue: "0" },
    { label: "Refeições", baseValue: "0", currentValue: "0" },
    { label: "Alocações de dose", baseValue: "0", currentValue: "0" },
    { label: "Ciclos", baseValue: "0", currentValue: "0" },
    { label: "Passos de ciclo", baseValue: "0", currentValue: "0" },
  ]);
});

test("same cycle count but changed manual sequence is visible in version comparison", () => {
  const variant = (variantKey: string, label: string) => ({
    variantKey, label, meals: [{ label: "Única", position: 1, doseAllocations: [{ doseType: "protein", doseQuantity: 2 }] }],
  });
  const oldPlan = { variants: [variant("x", "A"), variant("y", "B")],
    cycles: [{ steps: [{ position: 1, variantKey: "x" }, { position: 2, variantKey: "y" }] }] };
  const newPlan = { variants: [variant("x", "A"), variant("y", "B")],
    cycles: [{ steps: [{ position: 1, variantKey: "y" }, { position: 2, variantKey: "x" }] }] };
  const rows = buildProtocolPlanComparison(newPlan, oldPlan);
  assert.ok(rows.some((row) => row.label === "Ordem e variações dos ciclos" &&
    row.baseValue === "Ciclo 1: 1. A → 2. B" && row.currentValue === "Ciclo 1: 1. B → 2. A"));
});
