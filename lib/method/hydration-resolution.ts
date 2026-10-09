import {
  evaluateMethodEngineConfiguration,
  type MethodEngineConfiguration,
} from "./config-engine.ts";
import { hydrationDailyTargetMl } from "./hydration.ts";

type HydrationOverride = {
  parameters?: {
    daily_ml_per_kg?: {
      value: number;
      unit: "ml_per_kg";
    };
  };
};

export type ResolvedHydrationTarget = {
  configuration: MethodEngineConfiguration;
  targetMl: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  const allowedSet = new Set(allowed);

  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      throw new TypeError(label + " contains unsupported key " + key);
    }
  }
}

export function parseHydrationClientOverride(value: unknown): HydrationOverride {
  if (!isRecord(value)) {
    throw new TypeError("hydration override must be an object");
  }

  assertExactKeys(value, ["parameters"], "hydration override");

  if (!("parameters" in value)) {
    return {};
  }

  if (!isRecord(value.parameters)) {
    throw new TypeError("hydration override parameters must be an object");
  }

  assertExactKeys(
    value.parameters,
    ["daily_ml_per_kg"],
    "hydration override parameters",
  );

  if (!("daily_ml_per_kg" in value.parameters)) {
    return { parameters: {} };
  }

  const parameter = value.parameters.daily_ml_per_kg;

  if (!isRecord(parameter)) {
    throw new TypeError("daily_ml_per_kg override must be an object");
  }

  assertExactKeys(
    parameter,
    ["value", "unit"],
    "daily_ml_per_kg override",
  );

  if (
    typeof parameter.value !== "number" ||
    !Number.isFinite(parameter.value) ||
    parameter.value <= 0
  ) {
    throw new RangeError(
      "daily_ml_per_kg override must be a finite positive number",
    );
  }

  if (parameter.unit !== "ml_per_kg") {
    throw new TypeError("daily_ml_per_kg override must use ml_per_kg");
  }

  return {
    parameters: {
      daily_ml_per_kg: {
        value: parameter.value,
        unit: "ml_per_kg",
      },
    },
  };
}

export function resolveHydrationConfiguration(
  templateConfigurationValue: unknown,
  clientOverrideValue?: unknown,
) {
  const validatedTemplate = evaluateMethodEngineConfiguration(
    templateConfigurationValue,
    {
      weight_kg: {
        value: 1,
        unit: "kg",
      },
    },
  ).configuration;

  if (clientOverrideValue === undefined || clientOverrideValue === null) {
    return structuredClone(validatedTemplate);
  }

  const override = parseHydrationClientOverride(clientOverrideValue);
  const resolved = structuredClone(validatedTemplate);
  const overriddenParameter = override.parameters?.daily_ml_per_kg;

  if (overriddenParameter) {
    if (!("daily_ml_per_kg" in resolved.parameters)) {
      throw new TypeError(
        "hydration template does not declare daily_ml_per_kg",
      );
    }

    if (resolved.parameters.daily_ml_per_kg.unit !== "ml_per_kg") {
      throw new TypeError(
        "hydration template daily_ml_per_kg has unexpected unit",
      );
    }

    resolved.parameters.daily_ml_per_kg = overriddenParameter;
  }

  evaluateMethodEngineConfiguration(resolved, {
    weight_kg: { value: 1, unit: "kg" },
  });
  return resolved;
}

export function resolveHydrationTarget(
  templateConfigurationValue: unknown,
  weightKg: number,
  clientOverrideValue?: unknown,
): ResolvedHydrationTarget {
  const configuration = resolveHydrationConfiguration(
    templateConfigurationValue,
    clientOverrideValue,
  );

  return {
    configuration,
    targetMl: hydrationDailyTargetMl(configuration, weightKg),
  };
}
