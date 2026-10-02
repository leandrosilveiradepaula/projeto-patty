export type LiquidHydrationClass =
  | "pure_water"
  | "zero_calorie_other";

export type LiquidKindDefinition = {
  key: string;
  label: string;
  hydrationClass: LiquidHydrationClass;
};

export type LiquidTaxonomyConfiguration = {
  kinds: LiquidKindDefinition[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonBlank(value: unknown, path: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(path + " must be a non-blank string");
  }

  return value.trim();
}

function exactKeys(
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

export function parseLiquidTaxonomyConfiguration(
  value: unknown,
): LiquidTaxonomyConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("liquid taxonomy configuration must be an object");
  }

  exactKeys(value, ["kinds"], "liquid taxonomy configuration");

  if (!Array.isArray(value.kinds) || value.kinds.length === 0) {
    throw new TypeError(
      "liquid taxonomy configuration.kinds must be a non-empty array",
    );
  }

  const seenKeys = new Set<string>();
  const kinds = value.kinds.map((rawKind, index) => {
    const path = "liquid taxonomy configuration.kinds[" + index + "]";

    if (!isRecord(rawKind)) {
      throw new TypeError(path + " must be an object");
    }

    exactKeys(rawKind, ["key", "label", "hydrationClass"], path);

    const key = nonBlank(rawKind.key, path + ".key");
    const label = nonBlank(rawKind.label, path + ".label");

    if (
      rawKind.hydrationClass !== "pure_water" &&
      rawKind.hydrationClass !== "zero_calorie_other"
    ) {
      throw new TypeError(
        path +
          ".hydrationClass must be pure_water or zero_calorie_other",
      );
    }

    const hydrationClass: LiquidHydrationClass =
      rawKind.hydrationClass;

    if (seenKeys.has(key)) {
      throw new TypeError("liquid taxonomy keys must be unique");
    }

    seenKeys.add(key);

    return {
      key,
      label,
      hydrationClass,
    };
  });

  if (!kinds.some((kind) => kind.hydrationClass === "pure_water")) {
    throw new TypeError(
      "liquid taxonomy must include at least one pure_water kind",
    );
  }

  return { kinds };
}

export function resolveLiquidKind(
  configurationValue: unknown,
  liquidKindKey: string,
) {
  const configuration =
    parseLiquidTaxonomyConfiguration(configurationValue);
  const kind = configuration.kinds.find(
    (candidate) => candidate.key === liquidKindKey,
  );

  if (!kind) {
    throw new RangeError("liquid kind is not allowed by the active taxonomy");
  }

  return kind;
}

export function isPureWaterLiquidKind(
  configurationValue: unknown,
  liquidKindKey: string,
) {
  return (
    resolveLiquidKind(configurationValue, liquidKindKey).hydrationClass ===
    "pure_water"
  );
}
