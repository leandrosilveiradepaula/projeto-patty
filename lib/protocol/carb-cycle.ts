export const CARB_CYCLE_PHASES = {
  1: {
    carbHighGPerKg: 4.4,
    carbLinearGPerKg: 2.5,
    carbLowGPerKg: 1.55,
    proteinGPerKg: 2.3,
  },
  2: {
    carbHighGPerKg: 3.5,
    carbLinearGPerKg: 2,
    carbLowGPerKg: 1.25,
    proteinGPerKg: 2.3,
  },
  3: {
    carbHighGPerKg: 2.6,
    carbLinearGPerKg: 1.5,
    carbLowGPerKg: 0.95,
    proteinGPerKg: 2.3,
  },
  4: {
    carbHighGPerKg: 1.7,
    carbLinearGPerKg: 1,
    carbLowGPerKg: 0.65,
    proteinGPerKg: 2.3,
  },
} as const;

export type CarbCyclePhase = keyof typeof CARB_CYCLE_PHASES;

export type CarbCycleCalculation = {
  phase: CarbCyclePhase;
  weightKg: number;
  proteinGrams: number;
  carbLinearGrams: number;
  carbLowDay1Grams: number;
  carbLowDay2Grams: number;
  carbHighDayGrams: number;
};

export function isCarbCyclePhase(value: number): value is CarbCyclePhase {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function calculateCarbCycle(
  weightKg: number,
  phase: CarbCyclePhase,
): CarbCycleCalculation {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("weightKg must be a positive finite number");
  }

  const coefficients = CARB_CYCLE_PHASES[phase];

  return {
    phase,
    weightKg,
    proteinGrams: weightKg * coefficients.proteinGPerKg,
    carbLinearGrams: weightKg * coefficients.carbLinearGPerKg,
    carbLowDay1Grams: weightKg * coefficients.carbLowGPerKg,
    carbLowDay2Grams: weightKg * coefficients.carbLowGPerKg,
    carbHighDayGrams: weightKg * coefficients.carbHighGPerKg,
  };
}
