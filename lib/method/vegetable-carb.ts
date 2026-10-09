import { evaluateMethodEngineConfiguration } from "./config-engine.ts";

export function vegetableCarbohydrateDoseEquivalent(
  configurationValue: unknown,
  vegetableDoses: number,
) {
  if (!Number.isFinite(vegetableDoses) || vegetableDoses < 0) {
    throw new RangeError(
      "vegetableDoses must be a finite non-negative number",
    );
  }

  const result = evaluateMethodEngineConfiguration(
    configurationValue,
    {
      vegetable_doses: {
        value: vegetableDoses,
        unit: "dose",
      },
    },
  );

  const output = result.outputs.carbohydrate_dose_equivalent;

  if (!output || output.unit !== "dose") {
    throw new TypeError(
      "vegetable carbohydrate configuration is missing dose output carbohydrate_dose_equivalent",
    );
  }

  if (!Number.isFinite(output.value) || output.value < 0) {
    throw new RangeError("vegetable carbohydrate dose output must be finite and non-negative");
  }
  return output.value;
}
