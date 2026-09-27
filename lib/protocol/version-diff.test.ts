import assert from "node:assert/strict";
import test from "node:test";

import { buildProtocolVersionPlanDiff } from "./version-diff.ts";

test("protocol version diff compares only persisted plan facts", () => {
  const diff = buildProtocolVersionPlanDiff(
    {
      foodEquivalentCatalogVersionId: "catalog-1",
      variants: [
        {
          variantKey: "linear",
          meals: [
            {
              doseAllocations: [
                { doseType: "protein", doseQuantity: 2 },
                { doseType: "carbohydrate", doseQuantity: 2 },
              ],
            },
          ],
        },
        {
          variantKey: "old",
          meals: [{ doseAllocations: [] }],
        },
      ],
      cycles: [
        {
          steps: [
            { position: 2, variantKey: "linear" },
            { position: 1, variantKey: "old" },
          ],
        },
      ],
    },
    {
      foodEquivalentCatalogVersionId: "catalog-2",
      variants: [
        {
          variantKey: "linear",
          meals: [
            {
              doseAllocations: [
                { doseType: "protein", doseQuantity: 2 },
                { doseType: "carbohydrate", doseQuantity: 1 },
              ],
            },
            {
              doseAllocations: [{ doseType: "carbohydrate", doseQuantity: 1 }],
            },
          ],
        },
        {
          variantKey: "new",
          meals: [{ doseAllocations: [] }],
        },
      ],
      cycles: [
        {
          steps: [
            { position: 1, variantKey: "linear" },
            { position: 2, variantKey: "new" },
          ],
        },
      ],
    },
  );

  assert.ok(diff);
  assert.equal(diff.catalogChanged, true);
  assert.equal(diff.catalogBefore, "catalog-1");
  assert.equal(diff.catalogAfter, "catalog-2");
  assert.equal(diff.cycleChanged, true);
  assert.deepEqual(diff.cycleBefore, ["old → linear"]);
  assert.deepEqual(diff.cycleAfter, ["linear → new"]);

  assert.deepEqual(
    diff.variants.map((variant) => ({
      key: variant.variantKey,
      status: variant.status,
      beforeMeals: variant.beforeMealCount,
      afterMeals: variant.afterMealCount,
    })),
    [
      { key: "linear", status: "changed", beforeMeals: 1, afterMeals: 2 },
      { key: "new", status: "added", beforeMeals: 0, afterMeals: 1 },
      { key: "old", status: "removed", beforeMeals: 1, afterMeals: 0 },
    ],
  );

  const linear = diff.variants.find((variant) => variant.variantKey === "linear");
  assert.deepEqual(linear?.doseTotals, [
    { doseType: "carbohydrate", before: 2, after: 2 },
    { doseType: "protein", before: 2, after: 2 },
  ]);
});

test("protocol version diff returns null without both persisted plans", () => {
  assert.equal(buildProtocolVersionPlanDiff(null, null), null);
  assert.equal(
    buildProtocolVersionPlanDiff(
      {
        foodEquivalentCatalogVersionId: null,
        variants: [],
        cycles: [],
      },
      null,
    ),
    null,
  );
});
