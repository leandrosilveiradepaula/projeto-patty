export const DOSE_GRAMS = {
  protein: 15,
  carbohydrate: 12,
  fat: 6,
} as const;

export type DoseType = keyof typeof DOSE_GRAMS;

export function gramsPerDose(type: DoseType) {
  return DOSE_GRAMS[type];
}

export function dosesToGrams(type: DoseType, doses: number) {
  if (!Number.isFinite(doses) || doses < 0) {
    throw new RangeError("doses must be a finite non-negative number");
  }

  return doses * DOSE_GRAMS[type];
}

export function gramsToDoses(type: DoseType, grams: number) {
  if (!Number.isFinite(grams) || grams < 0) {
    throw new RangeError("grams must be a finite non-negative number");
  }

  return grams / DOSE_GRAMS[type];
}

export function maxHigherFatProteinDoses(totalProteinDoses: number) {
  if (
    !Number.isInteger(totalProteinDoses) ||
    totalProteinDoses < 0
  ) {
    throw new RangeError(
      "totalProteinDoses must be a non-negative integer",
    );
  }

  return Math.ceil(totalProteinDoses / 2);
}
