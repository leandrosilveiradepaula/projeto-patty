import assert from "node:assert/strict";
import test from "node:test";

import { buildProtocolPlanComparison } from "./version-diff.ts";

test("protocol plan comparison reports factual structure and dose totals", () => {
  const rows = buildProtocolPlanComparison(
    {
      cycles: [{ steps: [{}, {}] }],
      variants: [
        {
          meals: [
            {
              doseAllocations: [
                { doseQuantity: 2, doseType: "protein" },
                { doseQuantity: 1.5, doseType: "carbohydrate" },
              ],
            },
            {
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
          meals: [
            {
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
