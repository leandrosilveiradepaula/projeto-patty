export type ProtocolDiffMealPlan = {
  foodEquivalentCatalogVersionId: string | null;
  variants: Array<{
    variantKey: string;
    meals: Array<{
      doseAllocations: Array<{
        doseQuantity: number;
        doseType: string;
      }>;
    }>;
  }>;
  cycles: Array<{
    steps: Array<{
      position: number;
      variantKey: string;
    }>;
  }>;
};

export type ProtocolDoseTotalDiff = {
  after: number;
  before: number;
  doseType: string;
};

export type ProtocolVariantDiff = {
  afterMealCount: number;
  beforeMealCount: number;
  doseTotals: ProtocolDoseTotalDiff[];
  status: "added" | "changed" | "removed" | "unchanged";
  variantKey: string;
};

export type ProtocolVersionPlanDiff = {
  catalogChanged: boolean;
  catalogAfter: string | null;
  catalogBefore: string | null;
  cycleChanged: boolean;
  cycleAfter: string[];
  cycleBefore: string[];
  variants: ProtocolVariantDiff[];
};

function summarizeVariant(
  variant:
    | {
        variantKey: string;
        meals: Array<{
          doseAllocations: Array<{
            doseQuantity: number;
            doseType: string;
          }>;
        }>;
      }
    | undefined,
) {
  const totals = new Map<string, number>();

  if (!variant) {
    return {
      mealCount: 0,
      totals,
    };
  }

  for (const meal of variant.meals) {
    for (const allocation of meal.doseAllocations) {
      totals.set(
        allocation.doseType,
        (totals.get(allocation.doseType) ?? 0) + allocation.doseQuantity,
      );
    }
  }

  return {
    mealCount: variant.meals.length,
    totals,
  };
}

function cycleSignatures(plan: ProtocolDiffMealPlan) {
  return plan.cycles.map((cycle) =>
    [...cycle.steps]
      .sort((left, right) => left.position - right.position)
      .map((step) => step.variantKey)
      .join(" → "),
  );
}

export function buildProtocolVersionPlanDiff(
  before: ProtocolDiffMealPlan | null,
  after: ProtocolDiffMealPlan | null,
): ProtocolVersionPlanDiff | null {
  if (!before || !after) {
    return null;
  }

  const beforeByKey = new Map(
    before.variants.map((variant) => [variant.variantKey, variant]),
  );
  const afterByKey = new Map(
    after.variants.map((variant) => [variant.variantKey, variant]),
  );
  const variantKeys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])]
    .sort();

  const variants = variantKeys.map((variantKey) => {
    const beforeVariant = beforeByKey.get(variantKey);
    const afterVariant = afterByKey.get(variantKey);
    const beforeSummary = summarizeVariant(beforeVariant);
    const afterSummary = summarizeVariant(afterVariant);
    const doseTypes = [
      ...new Set([
        ...beforeSummary.totals.keys(),
        ...afterSummary.totals.keys(),
      ]),
    ].sort();
    const doseTotals = doseTypes.map((doseType) => ({
      after: afterSummary.totals.get(doseType) ?? 0,
      before: beforeSummary.totals.get(doseType) ?? 0,
      doseType,
    }));
    const changed =
      beforeSummary.mealCount !== afterSummary.mealCount ||
      doseTotals.some((dose) => dose.before !== dose.after);

    return {
      afterMealCount: afterSummary.mealCount,
      beforeMealCount: beforeSummary.mealCount,
      doseTotals,
      status: !beforeVariant
        ? "added"
        : !afterVariant
          ? "removed"
          : changed
            ? "changed"
            : "unchanged",
      variantKey,
    } satisfies ProtocolVariantDiff;
  });

  const cycleBefore = cycleSignatures(before);
  const cycleAfter = cycleSignatures(after);

  return {
    catalogAfter: after.foodEquivalentCatalogVersionId,
    catalogBefore: before.foodEquivalentCatalogVersionId,
    catalogChanged:
      before.foodEquivalentCatalogVersionId !==
      after.foodEquivalentCatalogVersionId,
    cycleAfter,
    cycleBefore,
    cycleChanged: JSON.stringify(cycleBefore) !== JSON.stringify(cycleAfter),
    variants,
  };
}
