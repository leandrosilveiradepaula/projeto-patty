import { evaluateMethodEngineConfiguration } from "./config-engine.ts";

export function hydrationDailyTargetMl(
  configurationValue: unknown,
  weightKg: number,
) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError("weightKg must be a finite positive number");
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

  const output = result.outputs.target_ml;

  if (!output || output.unit !== "ml") {
    throw new TypeError(
      "hydration target configuration is missing ml output target_ml",
    );
  }

  if (!Number.isFinite(output.value) || output.value < 0) {
    throw new RangeError("hydration target must be finite and non-negative");
  }
  return output.value;
}
