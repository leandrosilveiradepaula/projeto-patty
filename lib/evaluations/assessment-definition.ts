export type AssessmentMeasurementRequirement = {
  key: string;
  label: string;
  aliases: string[];
};

export type AssessmentPhotoRequirement = {
  label: string;
  minimumCount: number;
};

export type AssessmentDefinitionConfiguration = {
  kindKey: string;
  requiredMeasurements: AssessmentMeasurementRequirement[];
  photoRequirement: AssessmentPhotoRequirement | null;
};

export type ConfigurableAssessmentReadinessItem = {
  key: string;
  label: string;
  present: boolean;
};

export type ConfigurableAssessmentReadiness = {
  canFinalizeDeterministically: boolean;
  items: ConfigurableAssessmentReadinessItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function nonBlank(value: unknown, path: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(path + " must be a non-blank string");
  }
  return value.trim();
}

export function normalizeConfiguredAssessmentKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

export function parseAssessmentDefinitionConfiguration(
  value: unknown,
): AssessmentDefinitionConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("assessment definition must be an object");
  }

  exactKeys(
    value,
    ["kindKey", "requiredMeasurements", "photoRequirement"],
    "assessment definition",
  );

  const kindKey = nonBlank(value.kindKey, "assessment definition.kindKey");

  if (
    !Array.isArray(value.requiredMeasurements) ||
    value.requiredMeasurements.length === 0
  ) {
    throw new TypeError(
      "assessment definition.requiredMeasurements must be non-empty",
    );
  }

  const seenKeys = new Set<string>();
  const seenAliases = new Set<string>();
  const requiredMeasurements = value.requiredMeasurements.map(
    (raw, index) => {
      const path = "assessment definition.requiredMeasurements[" + index + "]";
      if (!isRecord(raw)) {
        throw new TypeError(path + " must be an object");
      }

      exactKeys(raw, ["key", "label", "aliases"], path);
      const key = normalizeConfiguredAssessmentKey(nonBlank(raw.key, path + ".key"));
      const label = nonBlank(raw.label, path + ".label");

      if (seenKeys.has(key)) {
        throw new TypeError("assessment measurement keys must be unique");
      }
      seenKeys.add(key);

      if (!Array.isArray(raw.aliases)) {
        throw new TypeError(path + ".aliases must be an array");
      }

      const aliases = raw.aliases.map((alias, aliasIndex) =>
        normalizeConfiguredAssessmentKey(
          nonBlank(alias, path + ".aliases[" + aliasIndex + "]"),
        ),
      );

      const normalizedAliases = Array.from(new Set([key, ...aliases]));
      for (const alias of normalizedAliases) {
        if (seenAliases.has(alias)) {
          throw new TypeError(
            "assessment measurement aliases must map to only one required key",
          );
        }
        seenAliases.add(alias);
      }

      return { key, label, aliases: normalizedAliases };
    },
  );

  let photoRequirement: AssessmentPhotoRequirement | null = null;
  if (value.photoRequirement !== null) {
    if (!isRecord(value.photoRequirement)) {
      throw new TypeError(
        "assessment definition.photoRequirement must be an object or null",
      );
    }

    exactKeys(
      value.photoRequirement,
      ["label", "minimumCount"],
      "assessment definition.photoRequirement",
    );

    if (
      typeof value.photoRequirement.minimumCount !== "number" ||
      !Number.isInteger(value.photoRequirement.minimumCount) ||
      value.photoRequirement.minimumCount <= 0
    ) {
      throw new TypeError(
        "assessment definition.photoRequirement.minimumCount must be a positive integer",
      );
    }

    photoRequirement = {
      label: nonBlank(
        value.photoRequirement.label,
        "assessment definition.photoRequirement.label",
      ),
      minimumCount: value.photoRequirement.minimumCount,
    };
  }

  return {
    kindKey,
    requiredMeasurements,
    photoRequirement,
  };
}

export function buildConfigurableAssessmentReadiness(
  configurationValue: unknown,
  input: {
    measurementKeys: string[];
    photoCount: number;
  },
): ConfigurableAssessmentReadiness {
  if (!Number.isInteger(input.photoCount) || input.photoCount < 0) {
    throw new RangeError("photoCount must be a non-negative integer");
  }

  const configuration =
    parseAssessmentDefinitionConfiguration(configurationValue);
  const aliasToKey = new Map<string, string>();

  for (const requirement of configuration.requiredMeasurements) {
    for (const alias of requirement.aliases) {
      aliasToKey.set(alias, requirement.key);
    }
  }

  const presentKeys = new Set(
    input.measurementKeys.map((value) => {
      const normalized = normalizeConfiguredAssessmentKey(value);
      return aliasToKey.get(normalized) ?? normalized;
    }),
  );

  const items: ConfigurableAssessmentReadinessItem[] =
    configuration.requiredMeasurements.map((requirement) => ({
      key: requirement.key,
      label: requirement.label,
      present: presentKeys.has(requirement.key),
    }));

  if (configuration.photoRequirement) {
    items.push({
      key: "photo",
      label: configuration.photoRequirement.label,
      present:
        input.photoCount >= configuration.photoRequirement.minimumCount,
    });
  }

  return {
    canFinalizeDeterministically: items.every((item) => item.present),
    items,
  };
}
