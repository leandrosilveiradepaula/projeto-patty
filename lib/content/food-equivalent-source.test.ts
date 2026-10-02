import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildHistoricalFoodEquivalentValidationReference,
  validateHistoricalFoodEquivalentSource,
} from "./food-equivalent-source.ts";

const sourcePath =
  "docs/source_drafts/food_equivalent_catalog_historical_source.json";

const currentReconciliationReference = {
  macroDoseReferences: {
    protein_grams: 15,
    carbohydrate_grams: 12,
    fat_grams: 6,
    vegetable_grams: 6,
  },
  vegetableDosesPerCarbohydrateDose: 2,
  nonFreeItemDoseMarker: "1",
};

test("historical food source is structurally valid but always fail-closed for publication", async () => {
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const result = validateHistoricalFoodEquivalentSource(
    source,
    currentReconciliationReference,
  );

  assert.equal(result.publishable, false);
  assert.equal(result.groupCount, 12);
  assert.equal(result.itemCount > 100, true);
  assert.deepEqual(result.issues, []);
});

test("historical food source validator detects drift against explicit references", () => {
  const result = validateHistoricalFoodEquivalentSource(
    {
      status: "approved",
      macro_dose_references: {
        protein_grams: 30,
        carbohydrate_grams: 25,
        fat_grams: 10,
        vegetable_grams: 12,
      },
      confirmed_current_rules: {
        vegetable_doses_per_carbohydrate_dose: 1,
      },
      groups: [],
    },
    currentReconciliationReference,
  );

  assert.equal(result.publishable, false);
  assert.equal(
    result.issues.some((issue) => issue.code === "invalid_source_status"),
    true,
  );
  assert.equal(
    result.issues.filter((issue) => issue.code === "macro_reference_mismatch")
      .length,
    4,
  );
  assert.equal(
    result.issues.some((issue) => issue.code === "vegetable_conversion_mismatch"),
    true,
  );
});

test("historical source validator detects duplicate group and item labels", () => {
  const result = validateHistoricalFoodEquivalentSource(
    {
      status: "historical_source_draft_review_required",
      macro_dose_references: {
        protein_grams: 15,
        carbohydrate_grams: 12,
        fat_grams: 6,
        vegetable_grams: 6,
      },
      confirmed_current_rules: {
        vegetable_doses_per_carbohydrate_dose: 2,
      },
      groups: [
        {
          key: "protein",
          label: "Proteína",
          items: [
            ["Frango", "50g", "1"],
            ["frango", "60g", "1"],
          ],
        },
        {
          key: "protein",
          label: "Proteína duplicada",
          items: [],
        },
      ],
    },
    currentReconciliationReference,
  );

  assert.equal(
    result.issues.some((issue) => issue.code === "duplicate_group_key"),
    true,
  );
  assert.equal(
    result.issues.some(
      (issue) => issue.code === "duplicate_item_label_within_group",
    ),
    true,
  );
});

test("validator behavior follows a different reconciliation reference without code changes", () => {
  const source = {
    status: "historical_source_draft_review_required",
    macro_dose_references: {
      protein_grams: 18,
      carbohydrate_grams: 14,
      fat_grams: 7,
      vegetable_grams: 8,
    },
    confirmed_current_rules: {
      vegetable_doses_per_carbohydrate_dose: 3,
    },
    groups: [
      {
        key: "protein",
        label: "Proteína",
        items: [["Frango", "50g", "2"]],
      },
    ],
  };

  const result = validateHistoricalFoodEquivalentSource(source, {
    macroDoseReferences: {
      protein_grams: 18,
      carbohydrate_grams: 14,
      fat_grams: 7,
      vegetable_grams: 8,
    },
    vegetableDosesPerCarbohydrateDose: 3,
    nonFreeItemDoseMarker: "2",
  });

  assert.deepEqual(result.issues, []);
});

test("invalid reconciliation references fail closed", () => {
  assert.throws(
    () =>
      validateHistoricalFoodEquivalentSource(
        {},
        {
          ...currentReconciliationReference,
          vegetableDosesPerCarbohydrateDose: 0,
        },
      ),
    TypeError,
  );

  assert.throws(
    () =>
      validateHistoricalFoodEquivalentSource(
        {},
        {
          ...currentReconciliationReference,
          macroDoseReferences: {
            ...currentReconciliationReference.macroDoseReferences,
            protein_grams: Number.NaN,
          },
        },
      ),
    TypeError,
  );
});


test("reconciliation reference derives professional values from configurations", () => {
  const reference = buildHistoricalFoodEquivalentValidationReference({
    proteinDoseConfiguration: { value: 15, unit: "g_per_dose" },
    carbohydrateDoseConfiguration: { value: 12, unit: "g_per_dose" },
    fatDoseConfiguration: { value: 6, unit: "g_per_dose" },
    vegetableCarbohydrateConfiguration: {
      inputs: { vegetable_doses: { unit: "dose" } },
      parameters: {
        vegetable_doses_per_carbohydrate_dose: {
          unit: "ratio",
          value: 2,
        },
      },
      outputs: {
        carbohydrate_dose_equivalent: {
          unit: "dose",
          expression: {
            op: "divide",
            args: [
              { op: "input", key: "vegetable_doses" },
              {
                op: "parameter",
                key: "vegetable_doses_per_carbohydrate_dose",
              },
            ],
          },
        },
      },
    },
    historicalVegetableGrams: 6,
    historicalNonFreeItemDoseMarker: "1",
  });

  assert.deepEqual(reference, currentReconciliationReference);
});

test("reconciliation reference follows changed professional configurations without code edits", () => {
  const reference = buildHistoricalFoodEquivalentValidationReference({
    proteinDoseConfiguration: { value: 18, unit: "g_per_dose" },
    carbohydrateDoseConfiguration: { value: 14, unit: "g_per_dose" },
    fatDoseConfiguration: { value: 7, unit: "g_per_dose" },
    vegetableCarbohydrateConfiguration: {
      inputs: { vegetable_doses: { unit: "dose" } },
      parameters: {
        vegetable_doses_per_carbohydrate_dose: {
          unit: "ratio",
          value: 3,
        },
      },
      outputs: {
        carbohydrate_dose_equivalent: {
          unit: "dose",
          expression: {
            op: "divide",
            args: [
              { op: "input", key: "vegetable_doses" },
              {
                op: "parameter",
                key: "vegetable_doses_per_carbohydrate_dose",
              },
            ],
          },
        },
      },
    },
    historicalVegetableGrams: 8,
    historicalNonFreeItemDoseMarker: "2",
  });

  assert.deepEqual(reference, {
    macroDoseReferences: {
      protein_grams: 18,
      carbohydrate_grams: 14,
      fat_grams: 7,
      vegetable_grams: 8,
    },
    vegetableDosesPerCarbohydrateDose: 3,
    nonFreeItemDoseMarker: "2",
  });
});
