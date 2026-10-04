import type { Json } from "@/lib/supabase/database.types";

import { validateMethodConfigurationBySchema } from "./schema-registry.ts";

export type EditableNumericParameter = {
  key: string;
  unit: string;
  value: number;
};

function assertFinite(value: number, key: string) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Parâmetro numérico inválido: ${key}`);
  }
}

function assertExactUpdateKeys(
  editable: readonly EditableNumericParameter[],
  updates: Readonly<Record<string, number>>,
) {
  const expected = [...editable.map((parameter) => parameter.key)].sort();
  const received = Object.keys(updates).sort();

  if (
    expected.length !== received.length ||
    expected.some((key, index) => key !== received[index])
  ) {
    throw new RangeError("Conjunto de parâmetros editáveis inválido");
  }

  for (const key of received) {
    assertFinite(updates[key], key);
  }
}

export function listEditableNumericParameters(
  configSchemaKey: string,
  configuration: Json,
): EditableNumericParameter[] {
  if (configSchemaKey === "scalar_parameter_v1") {
    const parsed = validateMethodConfigurationBySchema(
      configSchemaKey,
      configuration,
    );

    return [
      {
        key: "value",
        unit: parsed.unit,
        value: parsed.value,
      },
    ];
  }

  if (configSchemaKey === "method_engine_v1") {
    const parsed = validateMethodConfigurationBySchema(
      configSchemaKey,
      configuration,
    );

    return Object.entries(parsed.parameters)
      .map(([key, parameter]) => ({
        key,
        unit: parameter.unit,
        value: parameter.value,
      }))
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  return [];
}

export function updateEditableNumericParameters(
  configSchemaKey: string,
  configuration: Json,
  updates: Readonly<Record<string, number>>,
): Json {
  const editable = listEditableNumericParameters(
    configSchemaKey,
    configuration,
  );

  if (editable.length === 0) {
    throw new RangeError(
      "Este tipo de configuração ainda não possui editor numérico seguro",
    );
  }

  assertExactUpdateKeys(editable, updates);

  if (configSchemaKey === "scalar_parameter_v1") {
    const parsed = validateMethodConfigurationBySchema(
      configSchemaKey,
      configuration,
    );

    return validateMethodConfigurationBySchema(configSchemaKey, {
      ...parsed,
      value: updates.value,
    });
  }

  if (configSchemaKey === "method_engine_v1") {
    const parsed = validateMethodConfigurationBySchema(
      configSchemaKey,
      configuration,
    );
    const parameters = Object.fromEntries(
      Object.entries(parsed.parameters).map(([key, parameter]) => [
        key,
        {
          ...parameter,
          value: updates[key],
        },
      ]),
    );

    return validateMethodConfigurationBySchema(configSchemaKey, {
      ...parsed,
      parameters,
    });
  }

  throw new RangeError(
    "Este tipo de configuração ainda não possui editor numérico seguro",
  );
}

export function formatConfigurationUnit(unit: string) {
  const labels: Record<string, string> = {
    count: "quantidade",
    dose: "dose",
    g: "g",
    g_per_kg: "g/kg",
    g_per_dose: "g/dose",
    hour: "hora(s)",
    kg: "kg",
    ml: "mL",
    ml_per_kg: "mL/kg",
    ratio: "proporção",
  };

  return labels[unit] ?? unit;
}

export function formatConfigurationParameterKey(key: string) {
  const labels: Record<string, string> = {
    carbohydrate_per_kg: "Carboidrato por kg",
    daily_ml_per_kg: "Líquidos por kg/dia",
    fat_daily: "Gordura diária",
    protein_per_kg: "Proteína por kg",
    vegetable_doses_per_carbohydrate_dose:
      "Doses de legumes por dose de carboidrato",
    value: "Valor",
  };

  if (labels[key]) {
    return labels[key];
  }

  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
