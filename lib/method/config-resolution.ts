import {
  type MethodEngineConfiguration,
  validateMethodEngineConfiguration,
} from "./config-engine.ts";

export type MethodConfigurationOverridePatch = {
  id: string;
  configuration: unknown;
};

export type ResolvedMethodEngineConfiguration = {
  configuration: MethodEngineConfiguration;
  appliedOverrideIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function mergeKnownConfiguration(
  base: unknown,
  patch: unknown,
  path: string,
): unknown {
  if (!isRecord(patch)) {
    return cloneValue(patch);
  }

  if (!isRecord(base)) {
    throw new TypeError(
      "configuration override cannot descend into non-object at " + path,
    );
  }

  const merged: Record<string, unknown> = cloneValue(base);

  for (const [key, patchValue] of Object.entries(patch)) {
    if (!(key in base)) {
      throw new TypeError(
        "configuration override contains unknown field " + path + "." + key,
      );
    }

    merged[key] = mergeKnownConfiguration(
      base[key],
      patchValue,
      path + "." + key,
    );
  }

  return merged;
}

export function resolveMethodEngineConfiguration(
  templateConfigurationValue: unknown,
  overrides: readonly MethodConfigurationOverridePatch[],
): ResolvedMethodEngineConfiguration {
  let resolved: unknown = validateMethodEngineConfiguration(
    templateConfigurationValue,
  );
  const appliedOverrideIds: string[] = [];

  for (const override of overrides) {
    if (
      typeof override.id !== "string" ||
      override.id.trim().length === 0
    ) {
      throw new TypeError("configuration override id must be non-blank");
    }

    if (!isRecord(override.configuration)) {
      throw new TypeError(
        "configuration override must be an object for " + override.id,
      );
    }

    resolved = mergeKnownConfiguration(
      resolved,
      override.configuration,
      "$",
    );
    resolved = validateMethodEngineConfiguration(resolved);
    appliedOverrideIds.push(override.id);
  }

  return {
    configuration: resolved,
    appliedOverrideIds,
  };
}
