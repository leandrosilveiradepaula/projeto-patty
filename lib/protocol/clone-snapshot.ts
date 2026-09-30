import type { AccessibleProtocolVersionMealPlan } from "@/lib/supabase/data-access";

export type ProtocolCloneSnapshot = {
  cycles: Array<{
    steps: Array<{
      position: number;
      variantKey: string;
    }>;
  }>;
  foodEquivalentCatalogVersionId: string | null;
  variants: Array<{
    label: string | null;
    meals: Array<{
      doseAllocations: Array<{
        doseQuantity: number;
        doseType: string;
      }>;
      label: string | null;
      position: number;
    }>;
    variantKey: string;
  }>;
};

export function buildProtocolCloneSnapshot(
  plan: AccessibleProtocolVersionMealPlan | null,
): ProtocolCloneSnapshot | null {
  if (!plan) {
    return null;
  }

  return {
    cycles: plan.cycles.map((cycle) => ({
      steps: cycle.steps.map((step) => ({
        position: step.position,
        variantKey: step.variantKey,
      })),
    })),
    foodEquivalentCatalogVersionId: plan.foodEquivalentCatalogVersionId,
    variants: plan.variants.map((variant) => ({
      label: variant.label,
      meals: variant.meals.map((meal) => ({
        doseAllocations: meal.doseAllocations.map((allocation) => ({
          doseQuantity: allocation.doseQuantity,
          doseType: allocation.doseType,
        })),
        label: meal.label,
        position: meal.position,
      })),
      variantKey: variant.variantKey,
    })),
  };
}
