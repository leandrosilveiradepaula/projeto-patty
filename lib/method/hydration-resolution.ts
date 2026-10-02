import { resolveMethodEngineConfiguration } from "./config-resolution.ts";
import { hydrationDailyTargetMl } from "./hydration.ts";

export type HydrationTargetOverride = {
  id: string;
  configuration: unknown;
};

export type HydrationTargetResolution = {
  appliedOverrideIds: string[];
  resolvedConfiguration: unknown;
  targetMl: number;
  weightKg: number;
};

export function resolveHydrationTarget(input: {
  templateConfiguration: unknown;
  overrides?: readonly HydrationTargetOverride[];
  weightKg: number;
}): HydrationTargetResolution {
  const resolved = resolveMethodEngineConfiguration(
    input.templateConfiguration,
    input.overrides ?? [],
  );

  return {
    appliedOverrideIds: resolved.appliedOverrideIds,
    resolvedConfiguration: resolved.configuration,
    targetMl: hydrationDailyTargetMl(
      resolved.configuration,
      input.weightKg,
    ),
    weightKg: input.weightKg,
  };
}
