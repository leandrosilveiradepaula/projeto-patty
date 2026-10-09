export type AssessmentKindCatalogEntry = {
  historicalCode: string;
  semanticKey: string;
  label: string;
};

export type AssessmentKindCatalogConfiguration = {
  entries: AssessmentKindCatalogEntry[];
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

export function parseAssessmentKindCatalogConfiguration(
  value: unknown,
): AssessmentKindCatalogConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("assessment kind catalog must be an object");
  }

  exactKeys(value, ["entries"], "assessment kind catalog");

  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    throw new TypeError("assessment kind catalog.entries must be non-empty");
  }

  const historicalCodes = new Set<string>();
  const semanticKeys = new Set<string>();

  const entries = value.entries.map((raw, index) => {
    const path = "assessment kind catalog.entries[" + index + "]";

    if (!isRecord(raw)) {
      throw new TypeError(path + " must be an object");
    }

    exactKeys(raw, ["historicalCode", "semanticKey", "label"], path);

    const historicalCode = nonBlank(
      raw.historicalCode,
      path + ".historicalCode",
    );
    const semanticKey = nonBlank(raw.semanticKey, path + ".semanticKey");
    const label = nonBlank(raw.label, path + ".label");

    if (historicalCode.length > 120 || semanticKey.length > 120 || label.length > 200) {
      throw new TypeError(path + " exceeds maximum field length");
    }
    if (!/^[a-z][a-z0-9_-]*$/.test(historicalCode) || !/^[a-z][a-z0-9_-]*$/.test(semanticKey)) {
      throw new TypeError(path + " contains invalid identifier");
    }
    if (historicalCodes.has(historicalCode)) {
      throw new TypeError(
        "assessment historical codes must be unique",
      );
    }

    if (semanticKeys.has(semanticKey)) {
      throw new TypeError(
        "assessment semantic keys must be unique",
      );
    }

    historicalCodes.add(historicalCode);
    semanticKeys.add(semanticKey);

    return { historicalCode, semanticKey, label };
  });

  return { entries };
}

export function resolveAssessmentKindByHistoricalCode(
  configurationValue: unknown,
  historicalCode: string,
) {
  const configuration =
    parseAssessmentKindCatalogConfiguration(configurationValue);
  const entry = configuration.entries.find(
    (candidate) => candidate.historicalCode === historicalCode,
  );

  if (!entry) {
    throw new RangeError(
      "assessment historical code is not present in the active catalog",
    );
  }

  return entry;
}

export function assessmentKindLabelFromCatalog(
  configurationValue: unknown,
  historicalCode: string | null,
) {
  if (historicalCode === null) {
    return "Legada / não classificada";
  }

  return resolveAssessmentKindByHistoricalCode(
    configurationValue,
    historicalCode,
  ).label;
}
