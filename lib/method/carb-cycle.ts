export type CarbCycleCoefficient = {
  value: number;
  unit: "g_per_kg";
};

export type CarbCycleStepConfiguration = {
  key: string;
  label: string;
  carbohydratePerKg: CarbCycleCoefficient;
  proteinPerKg: CarbCycleCoefficient;
};

export type CarbCycleConfiguration = {
  phaseKey: string;
  steps: CarbCycleStepConfiguration[];
  linearAverageStepKeys: string[];
};

export type CarbCycleStepResult = {
  key: string;
  label: string;
  carbohydrateGrams: number;
  proteinGrams: number;
};

export type CarbCycleResult = {
  phaseKey: string;
  weightKg: number;
  steps: CarbCycleStepResult[];
  linearAverage: {
    carbohydrateGrams: number;
    proteinGrams: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      throw new TypeError(path + " contains unsupported field " + key);
    }
  }
}

function readNonBlankString(value: unknown, path: string, maxLength = 200) {
  if (typeof value !== "string" || value.trim().length === 0 || value !== value.trim() || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError(path + " must be a valid non-blank string");
  }

  return value;
}

function readIdentifier(value: unknown, path: string) {
  const identifier = readNonBlankString(value, path, 120);
  if (!/^[a-z][a-z0-9_-]*$/.test(identifier)) {
    throw new TypeError(path + " must be a safe identifier");
  }
  return identifier;
}

function readCoefficient(value: unknown, path: string): CarbCycleCoefficient {
  if (!isRecord(value)) {
    throw new TypeError(path + " must be an object");
  }

  assertExactKeys(value, ["value", "unit"], path);

  if (
    typeof value.value !== "number" ||
    !Number.isFinite(value.value) ||
    value.value < 0
  ) {
    throw new TypeError(path + ".value must be a finite non-negative number");
  }

  if (value.unit !== "g_per_kg") {
    throw new TypeError(path + ".unit must be g_per_kg");
  }

  return {
    value: value.value,
    unit: "g_per_kg",
  };
}

export function parseCarbCycleConfiguration(
  value: unknown,
): CarbCycleConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("carb cycle configuration must be an object");
  }

  assertExactKeys(
    value,
    ["phaseKey", "steps", "linearAverageStepKeys"],
    "configuration",
  );

  const phaseKey = readIdentifier(value.phaseKey, "configuration.phaseKey");

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    throw new TypeError("configuration.steps must be a non-empty array");
  }

  const seenStepKeys = new Set<string>();
  const steps = value.steps.map((stepValue, index) => {
    const stepPath = "configuration.steps[" + index + "]";

    if (!isRecord(stepValue)) {
      throw new TypeError(stepPath + " must be an object");
    }

    assertExactKeys(
      stepValue,
      ["key", "label", "carbohydratePerKg", "proteinPerKg"],
      stepPath,
    );

    const key = readIdentifier(stepValue.key, stepPath + ".key");

    if (seenStepKeys.has(key)) {
      throw new TypeError("carb cycle step keys must be unique");
    }
    seenStepKeys.add(key);

    return {
      key,
      label: readNonBlankString(stepValue.label, stepPath + ".label"),
      carbohydratePerKg: readCoefficient(
        stepValue.carbohydratePerKg,
        stepPath + ".carbohydratePerKg",
      ),
      proteinPerKg: readCoefficient(
        stepValue.proteinPerKg,
        stepPath + ".proteinPerKg",
      ),
    };
  });

  if (
    !Array.isArray(value.linearAverageStepKeys) ||
    value.linearAverageStepKeys.length === 0
  ) {
    throw new TypeError(
      "configuration.linearAverageStepKeys must be a non-empty array",
    );
  }

  const seenAverageKeys = new Set<string>();
  const linearAverageStepKeys = value.linearAverageStepKeys.map(
    (stepKeyValue, index) => {
      const key = readIdentifier(
        stepKeyValue,
        "configuration.linearAverageStepKeys[" + index + "]",
      );

      if (!seenStepKeys.has(key)) {
        throw new TypeError(
          "linear average references unknown carb cycle step " + key,
        );
      }

      if (seenAverageKeys.has(key)) {
        throw new TypeError("linear average step keys must be unique");
      }
      seenAverageKeys.add(key);
      return key;
    },
  );

  return {
    phaseKey,
    steps,
    linearAverageStepKeys,
  };
}

function assertValidWeight(weightKg: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError("weightKg must be a finite positive number");
  }
}

export function calculateCarbCycle(
  configurationValue: unknown,
  weightKg: number,
): CarbCycleResult {
  assertValidWeight(weightKg);
  const configuration = parseCarbCycleConfiguration(configurationValue);

  const steps = configuration.steps.map((step) => {
    const carbohydrateGrams = weightKg * step.carbohydratePerKg.value;
    const proteinGrams = weightKg * step.proteinPerKg.value;
    if (!Number.isFinite(carbohydrateGrams) || !Number.isFinite(proteinGrams)) {
      throw new RangeError("carb cycle step outputs must be finite");
    }
    return { key: step.key, label: step.label, carbohydrateGrams, proteinGrams };
  });

  const stepsByKey = new Map(steps.map((step) => [step.key, step]));
  const averageSteps = configuration.linearAverageStepKeys.map((key) => {
    const step = stepsByKey.get(key);
    if (!step) {
      throw new TypeError("linear average references missing result step " + key);
    }
    return step;
  });

  const divisor = averageSteps.length;
  const carbohydrateGrams =
    averageSteps.reduce((sum, step) => sum + step.carbohydrateGrams, 0) /
    divisor;
  const proteinGrams =
    averageSteps.reduce((sum, step) => sum + step.proteinGrams, 0) / divisor;

  if (!Number.isFinite(carbohydrateGrams) || !Number.isFinite(proteinGrams)) {
    throw new RangeError("carb cycle average outputs must be finite");
  }

  return {
    phaseKey: configuration.phaseKey,
    weightKg,
    steps,
    linearAverage: {
      carbohydrateGrams,
      proteinGrams,
    },
  };
}
