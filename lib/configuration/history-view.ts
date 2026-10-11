import type { Json } from "../supabase/database.types.ts";

/**
 * Configuration comparison is factual: it never evaluates formula nodes,
 * applies method defaults or interprets a patient's history.
 */
function stableValue(value: Json): Json {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item ?? null)]),
    );
  }
  return value;
}

export function canonicalConfiguration(value: Json): string {
  return JSON.stringify(stableValue(value));
}

export function configurationsEqual(left: Json, right: Json): boolean {
  return canonicalConfiguration(left) === canonicalConfiguration(right);
}

export type ConfigurationChange = {
  path: string;
  kind: "adicionado" | "removido" | "alterado";
  previous: string;
  current: string;
};

export function formatConfigurationDate(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function configurationLeafMap(input: Json) {
  const map = new Map<string, string>();
  const walk = (value: Json, path: string) => {
    if (value !== null && !Array.isArray(value) && typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length > 0) {
        for (const [key, item] of entries) {
          walk(item ?? null, path ? path + "." + key : key);
        }
        return;
      }
    }
    map.set(path || "(raiz)", JSON.stringify(stableValue(value)));
  };
  walk(input, "");
  return map;
}

export function listConfigurationChanges(
  previous: Json,
  current: Json,
): ConfigurationChange[] {
  const before = configurationLeafMap(previous);
  const after = configurationLeafMap(current);
  const keys = [...new Set([...before.keys(), ...after.keys()])]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return keys.flatMap((path) => {
    const a = before.get(path);
    const b = after.get(path);
    if (a === b) return [];
    return [{
      path,
      kind: a === undefined ? "adicionado" : b === undefined ? "removido" : "alterado",
      previous: a ?? "—",
      current: b ?? "—",
    } satisfies ConfigurationChange];
  });
}

export function formatConfigurationPath(path: string) {
  const translations: Record<string, string> = {
    request_weekday: "Dia do Feedback Semanal",
    reminder_weekday: "Dia do lembrete",
    request_time_local: "Horário local",
    timezone: "Fuso horário",
    complete_preferred_weekdays: "Dias preferidos para Avaliação Completa",
    basic_placement: "Posicionamento da Avaliação Básica",
    value: "Valor",
    unit: "Unidade",
  };
  if (Object.prototype.hasOwnProperty.call(translations, path)) return translations[path];
  return path.replaceAll("_", " ");
}

export function summarizeConfigurationHistory(
  versions: readonly {
    id: string;
    version_number: number;
    created_at: string;
    activated_at: string | null;
    retired_at: string | null;
    configuration: Json;
  }[],
  activeId: string | null,
) {
  const sorted = [...versions].sort(
    (left, right) => right.version_number - left.version_number ||
      left.id.localeCompare(right.id),
  );
  return sorted.map((version, index) => {
    const previous = sorted[index + 1] ?? null;
    const changes = previous
      ? listConfigurationChanges(previous.configuration, version.configuration)
      : [];
    return {
      ...version,
      isActive: version.id === activeId,
      previousNumber: previous?.version_number ?? null,
      changes,
      changeCount: changes.length,
    };
  });
}
