export type ProtocolDraftReadinessReason =
  | "missing_plan"
  | "missing_variant"
  | "variant_without_meal"
  | "meal_without_dose";

export type ProtocolDraftReadinessPlan = {
  variants: Array<{
    meals: Array<{
      doseAllocations: Array<unknown>;
    }>;
  }>;
};

export function getProtocolDraftReadiness(
  plan: ProtocolDraftReadinessPlan | null,
) {
  const reasons: ProtocolDraftReadinessReason[] = [];

  if (!plan) {
    reasons.push("missing_plan");
    return { ready: false, reasons };
  }

  if (plan.variants.length === 0) {
    reasons.push("missing_variant");
    return { ready: false, reasons };
  }

  if (plan.variants.some((variant) => variant.meals.length === 0)) {
    reasons.push("variant_without_meal");
  }

  if (
    plan.variants.some((variant) =>
      variant.meals.some((meal) => meal.doseAllocations.length === 0),
    )
  ) {
    reasons.push("meal_without_dose");
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

export function formatProtocolDraftReadiness(
  reasons: ProtocolDraftReadinessReason[],
) {
  if (reasons.includes("missing_plan")) {
    return "Inicie a estrutura alimentar antes de enviar esta versão para revisão.";
  }

  if (reasons.includes("missing_variant")) {
    return "Adicione ao menos uma variação alimentar antes da revisão.";
  }

  if (reasons.includes("variant_without_meal")) {
    return "Toda variação precisa ter ao menos uma refeição registrada.";
  }

  if (reasons.includes("meal_without_dose")) {
    return "Toda refeição precisa ter ao menos uma dose registrada.";
  }

  return "A estrutura alimentar mínima está registrada.";
}
