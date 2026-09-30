export type ProtocolPlanSnapshot = {
  cycles: Array<{
    steps: Array<unknown>;
  }>;
  variants: Array<{
    meals: Array<{
      doseAllocations: Array<{
        doseQuantity: number;
        doseType: string;
      }>;
    }>;
  }>;
} | null;

export type ProtocolPlanComparisonRow = {
  baseValue: string;
  currentValue: string;
  label: string;
};

function summarize(plan: ProtocolPlanSnapshot) {
  if (!plan) {
    return {
      allocationCount: 0,
      cycleCount: 0,
      cycleStepCount: 0,
      doseTotals: new Map<string, number>(),
      mealCount: 0,
      variantCount: 0,
    };
  }

  const doseTotals = new Map<string, number>();
  let mealCount = 0;
  let allocationCount = 0;

  for (const variant of plan.variants) {
    mealCount += variant.meals.length;

    for (const meal of variant.meals) {
      allocationCount += meal.doseAllocations.length;

      for (const allocation of meal.doseAllocations) {
        doseTotals.set(
          allocation.doseType,
          (doseTotals.get(allocation.doseType) ?? 0) +
            allocation.doseQuantity,
        );
      }
    }
  }

  return {
    allocationCount,
    cycleCount: plan.cycles.length,
    cycleStepCount: plan.cycles.reduce(
      (total, cycle) => total + cycle.steps.length,
      0,
    ),
    doseTotals,
    mealCount,
    variantCount: plan.variants.length,
  };
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

export function buildProtocolPlanComparison(
  currentPlan: ProtocolPlanSnapshot,
  basePlan: ProtocolPlanSnapshot,
): ProtocolPlanComparisonRow[] {
  const current = summarize(currentPlan);
  const base = summarize(basePlan);
  const rows: ProtocolPlanComparisonRow[] = [
    {
      baseValue: String(base.variantCount),
      currentValue: String(current.variantCount),
      label: "Variantes",
    },
    {
      baseValue: String(base.mealCount),
      currentValue: String(current.mealCount),
      label: "Refeições",
    },
    {
      baseValue: String(base.allocationCount),
      currentValue: String(current.allocationCount),
      label: "Alocações de dose",
    },
    {
      baseValue: String(base.cycleCount),
      currentValue: String(current.cycleCount),
      label: "Ciclos",
    },
    {
      baseValue: String(base.cycleStepCount),
      currentValue: String(current.cycleStepCount),
      label: "Passos de ciclo",
    },
  ];

  const doseTypes = [...new Set([
    ...base.doseTotals.keys(),
    ...current.doseTotals.keys(),
  ])].sort();

  for (const doseType of doseTypes) {
    rows.push({
      baseValue: formatNumber(base.doseTotals.get(doseType) ?? 0),
      currentValue: formatNumber(current.doseTotals.get(doseType) ?? 0),
      label: `Total de doses · ${doseType}`,
    });
  }

  return rows;
}
