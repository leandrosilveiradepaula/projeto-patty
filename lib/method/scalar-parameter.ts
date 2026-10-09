export type ScalarParameterConfiguration<Unit extends string = string> = {
  value: number;
  unit: Unit;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseScalarParameterShapeConfiguration(
  value: unknown,
): ScalarParameterConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("scalar parameter configuration must be an object");
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("value") ||
    !keys.includes("unit")
  ) {
    throw new TypeError(
      "scalar parameter configuration must contain only value and unit",
    );
  }

  if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
    throw new TypeError("scalar parameter value must be a finite number");
  }

  if (typeof value.unit !== "string" || value.unit.trim().length === 0 || value.unit.length > 80 || value.unit !== value.unit.trim()) {
    throw new TypeError(
      "scalar parameter unit must be a non-blank string",
    );
  }

  return {
    value: value.value,
    unit: value.unit,
  };
}

export function parseScalarParameterConfiguration<Unit extends string>(
  value: unknown,
  expectedUnit: Unit,
): ScalarParameterConfiguration<Unit> {
  const configuration = parseScalarParameterShapeConfiguration(value);

  if (configuration.unit !== expectedUnit) {
    throw new TypeError(
      "scalar parameter configuration has an unexpected unit",
    );
  }

  return {
    value: configuration.value,
    unit: expectedUnit,
  };
}
