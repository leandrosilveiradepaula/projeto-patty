export type RecognitionMetabolicReference = {
  carbohydrateGrams: number;
  fatGrams: number;
  proteinGrams: number;
};

export function recognitionMetabolicReferenceMacros(
  weightKg: number,
): RecognitionMetabolicReference {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError("weightKg must be a finite non-negative number");
  }

  return {
    proteinGrams: weightKg * 2,
    carbohydrateGrams: weightKg * 2,
    fatGrams: 50,
  };
}
