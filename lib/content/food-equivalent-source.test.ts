import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateHistoricalFoodEquivalentSource } from "./food-equivalent-source.ts";

const sourcePath =
  "docs/source_drafts/food_equivalent_catalog_historical_source.json";

test("historical food source is structurally valid but always fail-closed for publication", async () => {
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const result = validateHistoricalFoodEquivalentSource(source);

  assert.equal(result.publishable, false);
  assert.equal(result.groupCount, 11);
  assert.equal(result.itemCount > 100, true);
  assert.deepEqual(result.issues, []);
});

test("historical food source validator rejects confirmed-rule drift", () => {
  const result = validateHistoricalFoodEquivalentSource({
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
  });

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
  const result = validateHistoricalFoodEquivalentSource({
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
  });

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
