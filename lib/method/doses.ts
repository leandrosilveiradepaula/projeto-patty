import { evaluateMethodEngineConfiguration } from "./config-engine.ts";
import { parseScalarParameterConfiguration } from "./scalar-parameter.ts";

export const DOSE_TYPES = ["protein", "carbohydrate", "fat"] as const;

export type DoseType = (typeof DOSE_TYPES)[number];

export type DoseGramConfiguration = {
  value: number;
  unit: "g_per_dose";
};

export function parseDoseGramConfiguration(
  configurationValue: unknown,
): DoseGramConfiguration {
  return parseScalarParameterConfiguration(
    configurationValue,
    "g_per_dose",
  );
}

export function gramsPerDose(configurationValue: unknown) {
  return parseDoseGramConfiguration(configurationValue).value;
}

export function dosesToGrams(
  configurationValue: unknown,
  doses: number,
) {
  if (!Number.isFinite(doses) || doses < 0) {
    throw new RangeError("doses must be a finite non-negative number");
  }

  return doses * gramsPerDose(configurationValue);
}

export function gramsToDoses(
  configurationValue: unknown,
  grams: number,
) {
  if (!Number.isFinite(grams) || grams < 0) {
    throw new RangeError("grams must be a finite non-negative number");
  }

  const doseGrams = gramsPerDose(configurationValue);

  if (doseGrams <= 0) {
    throw new RangeError("grams per dose must be greater than zero");
  }

  return grams / doseGrams;
}

export function maxHigherFatProteinDoses(
  configurationValue: unknown,
  totalProteinDoses: number,
) {
  if (!Number.isFinite(totalProteinDoses) || totalProteinDoses < 0) {
    throw new RangeError(
      "totalProteinDoses must be a finite non-negative number",
    );
  }

  const result = evaluateMethodEngineConfiguration(
    configurationValue,
    {
      total_protein_doses: {
        value: totalProteinDoses,
        unit: "dose",
      },
    },
  );

  const output = result.outputs.max_higher_fat_protein_doses;

  if (!output || output.unit !== "dose") {
    throw new TypeError(
      "higher-fat protein limit configuration is missing dose output",
    );
  }

  return output.value;
}
