import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMealDraftAnamnesisContext,
  summarizeMealDraftPlan,
} from "./meal-draft-guidance.ts";

test("meal draft context uses only confirmed food-related Anamnesis fields", () => {
  const context = buildMealDraftAnamnesisContext(
    [
      { id: "q1", question_key: "favorite_foods" },
      { id: "q2", question_key: "least_favorite_foods" },
      { id: "q3", question_key: "relationship_with_food" },
      { id: "q4", question_key: "financial_capacity_for_supplements" },
    ],
    [
      { question_id: "q1", answer_value: "Arroz e ovos" },
      { question_id: "q2", answer_value: "Peixe" },
      { question_id: "q3", answer_value: "Como mais à noite" },
      { question_id: "q4", answer_value: "Sim" },
    ],
  );

  assert.deepEqual(context, {
    favoriteFoods: "Arroz e ovos",
    leastFavoriteFoods: "Peixe",
    relationshipWithFood: "Como mais à noite",
  });
});

test("meal plan summary totals persisted doses without redistributing them", () => {
  const summary = summarizeMealDraftPlan({
    variants: [
      {
        label: "Linear",
        variantKey: "linear",
        meals: [
          {
            doseAllocations: [
              { doseType: "protein", doseQuantity: 2 },
              { doseType: "carbohydrate", doseQuantity: 1.5 },
            ],
          },
          {
            doseAllocations: [
              { doseType: "protein", doseQuantity: 1 },
              { doseType: "carbohydrate", doseQuantity: 2 },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(summary, [
    {
      key: "linear",
      label: "Linear",
      mealCount: 2,
      doseTotals: [
        { doseType: "carbohydrate", total: 3.5 },
        { doseType: "protein", total: 3 },
      ],
    },
  ]);
});
