export type MealDraftQuestion = {
  id: string;
  question_key: string;
};

export type MealDraftAnswer = {
  answer_value: unknown;
  question_id: string;
};

export type MealDraftPlan = {
  variants: Array<{
    label: string | null;
    variantKey: string;
    meals: Array<{
      doseAllocations: Array<{
        doseQuantity: number;
        doseType: string;
      }>;
    }>;
  }>;
};

function answerAsText(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return null;
}

export function buildMealDraftAnamnesisContext(
  questions: MealDraftQuestion[],
  answers: MealDraftAnswer[],
) {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const values = new Map<string, string>();

  for (const answer of answers) {
    const question = questionById.get(answer.question_id);
    const text = answerAsText(answer.answer_value);

    if (question && text) {
      values.set(question.question_key, text);
    }
  }

  return {
    favoriteFoods: values.get("favorite_foods") ?? null,
    leastFavoriteFoods: values.get("least_favorite_foods") ?? null,
    relationshipWithFood: values.get("relationship_with_food") ?? null,
  };
}

export function summarizeMealDraftPlan(plan: MealDraftPlan | null) {
  if (!plan) {
    return [];
  }

  return plan.variants.map((variant) => {
    const totals = new Map<string, number>();

    for (const meal of variant.meals) {
      for (const allocation of meal.doseAllocations) {
        totals.set(
          allocation.doseType,
          (totals.get(allocation.doseType) ?? 0) + allocation.doseQuantity,
        );
      }
    }

    return {
      label: variant.label ?? variant.variantKey,
      mealCount: variant.meals.length,
      doseTotals: [...totals.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([doseType, total]) => ({ doseType, total })),
    };
  });
}
