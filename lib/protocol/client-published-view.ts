import type { CurrentClientPublishedProtocol } from "../supabase/data-access.ts";

export type PublishedNutritionPlan = NonNullable<CurrentClientPublishedProtocol["mealPlan"]>;


/** Exact targets inside one published, RLS-authorized nutritional snapshot. */
export function publishedMealAnchor(publicationId: string, mealId: string) {
  return "refeicao-" + publicationId + "-" + mealId;
}

export function publishedCycleAnchor(publicationId: string, cycleId: string) {
  return "ciclo-" + publicationId + "-" + cycleId;
}

export function publishedVariationAnchor(publicationId: string, variantId: string) {
  return "variacao-" + publicationId + "-" + variantId;
}

export function publishedVariationLabel(label: string | null, order: number) {
  const trimmed = label?.trim();
  return trimmed || "Variação " + order;
}

export function publishedMealLabel(label: string | null, position: number) {
  return label?.trim() || "Refeição " + position;
}

/**
 * This view preserves only the facts recorded in a published protocol.
 * No step is associated with today's date and no variant is chosen for the
 * client. Every cycle target must belong to the same published plan.
 */
export function buildClientPublishedNutritionView(plan: PublishedNutritionPlan) {
  const variants = plan.variants.map((variant, index) => ({
    id: variant.id,
    label: publishedVariationLabel(variant.label, index + 1),
    meals: [...variant.meals]
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((meal) => ({
        id: meal.id,
        order: meal.position,
        label: publishedMealLabel(meal.label, meal.position),
        doseGroups: meal.doseAllocations,
      })),
  }));
  const labelsById = new Map(variants.map((variant) => [variant.id, variant.label]));

  const cycles = plan.cycles.map((cycle) => ({
    id: cycle.id,
    steps: [...cycle.steps]
      .sort((a, b) => a.position - b.position || a.variantId.localeCompare(b.variantId))
      .map((step) => ({
        position: step.position,
        variantId: step.variantId,
        label: labelsById.get(step.variantId) ?? "Variação indisponível nesta versão",
        targetExists: labelsById.has(step.variantId),
      })),
  }));

  return {
    variants,
    cycles,
    variantCount: variants.length,
    mealCount: variants.reduce((total, variant) => total + variant.meals.length, 0),
    cycleCount: cycles.length,
    stepCount: cycles.reduce((total, cycle) => total + cycle.steps.length, 0),
  };
}

export type ClientPublishedSelection = {
  selectedId: string | null;
  invalidRequest: boolean;
  isHistorical: boolean;
};

/**
 * Never resolve a requested publication outside the already authorized list.
 * An unknown/invalid ID falls back to the latest publication without exposing
 * whether any unpublished or other-client record exists.
 */
export function selectClientPublishedVersion(
  visiblePublications: readonly { id: string }[],
  requested: unknown,
): ClientPublishedSelection {
  const newestId = visiblePublications[0]?.id ?? null;
  if (requested === undefined) {
    return { selectedId: newestId, invalidRequest: false, isHistorical: false };
  }
  const selected = typeof requested === "string"
    ? visiblePublications.find((item) => item.id === requested)
    : null;
  return {
    selectedId: selected?.id ?? newestId,
    invalidRequest: !selected,
    isHistorical: Boolean(selected && selected.id !== newestId),
  };
}

export function publishedVersionHref(publicationId: string) {
  return "/cliente/protocolo?publicacao=" + encodeURIComponent(publicationId) + "#publicacao-" + publicationId;
}
