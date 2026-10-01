import { evaluateMethodEngineConfiguration } from "./config-engine.ts";

export type RecognitionMetabolicReference = {
  carbohydrateGrams: number;
  fatGrams: number;
  proteinGrams: number;
};

function readGramOutput(
  outputs: ReturnType<typeof evaluateMethodEngineConfiguration>["outputs"],
  key: string,
) {
  const output = outputs[key];

  if (!output || output.unit !== "g") {
    throw new TypeError(
      "Recognition Metabolic configuration is missing gram output " + key,
    );
  }

  return output.value;
}

export function recognitionMetabolicReferenceMacros(
  configurationValue: unknown,
  weightKg: number,
): RecognitionMetabolicReference {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError("weightKg must be a finite non-negative number");
  }

  const result = evaluateMethodEngineConfiguration(
    configurationValue,
    {
      weight_kg: {
        value: weightKg,
        unit: "kg",
      },
    },
  );

  return {
    proteinGrams: readGramOutput(result.outputs, "protein_grams"),
    carbohydrateGrams: readGramOutput(
      result.outputs,
      "carbohydrate_grams",
    ),
    fatGrams: readGramOutput(result.outputs, "fat_grams"),
  };
}
