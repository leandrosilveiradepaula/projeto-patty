export type CarbCyclePhase = 1 | 2 | 3;

export type CarbCycleMacroValues = {
  low1Grams: number;
  low2Grams: number;
  highGrams: number;
  linearAverageGrams: number;
};

export type CarbCycleResult = {
  phase: CarbCyclePhase;
  weightKg: number;
  carbohydrate: CarbCycleMacroValues;
  protein: CarbCycleMacroValues;
};

type PhaseCoefficients = {
  carbohydrate: readonly [number, number, number];
  protein: readonly [number, number, number];
};

const PHASE_COEFFICIENTS: Record<CarbCyclePhase, PhaseCoefficients> = {
  1: {
    carbohydrate: [1.55, 1.55, 4.4],
    protein: [2.3, 2.3, 2.3],
  },
  2: {
    carbohydrate: [1.25, 1.25, 3.5],
    protein: [2.3, 2.3, 2.3],
  },
  3: {
    carbohydrate: [0.95, 0.95, 2.6],
    protein: [2.3, 2.3, 2.3],
  },
};

function assertValidWeight(weightKg: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("weightKg must be a positive finite number");
  }
}

function toValues(
  weightKg: number,
  coefficients: readonly [number, number, number],
): CarbCycleMacroValues {
  const [low1, low2, high] = coefficients;
  const average = (low1 + low2 + high) / 3;

  return {
    low1Grams: weightKg * low1,
    low2Grams: weightKg * low2,
    highGrams: weightKg * high,
    linearAverageGrams: weightKg * average,
  };
}

export function calculateCarbCyclePhase(
  weightKg: number,
  phase: CarbCyclePhase,
): CarbCycleResult {
  assertValidWeight(weightKg);

  const coefficients = PHASE_COEFFICIENTS[phase];

  return {
    phase,
    weightKg,
    carbohydrate: toValues(weightKg, coefficients.carbohydrate),
    protein: toValues(weightKg, coefficients.protein),
  };
}

export function getCarbCyclePhaseCoefficients(phase: CarbCyclePhase) {
  return PHASE_COEFFICIENTS[phase];
}
