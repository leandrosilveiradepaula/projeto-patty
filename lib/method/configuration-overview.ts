import "server-only";

import { createClient } from "@/lib/supabase/server";

type JsonRecord = Record<string, unknown>;

export type MethodConfigurationOverviewItem = {
  templateId: string;
  templateKey: string;
  domainKey: string;
  schemaKey: string;
  displayName: string;
  description: string | null;
  versionId: string;
  versionNumber: number;
  schemaVersion: number;
  sourceKind: string;
  activatedAt: string;
  summary: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)
    : null;
}

function humanizeUnit(unit: unknown) {
  switch (unit) {
    case "g_per_dose":
      return "g por dose";
    case "g_per_kg":
      return "g/kg";
    case "ml_per_kg":
      return "ml/kg";
    case "hour":
      return "h";
    case "g":
      return "g";
    case "ml":
      return "ml";
    case "dose":
      return "dose";
    case "ratio":
      return "";
    default:
      return typeof unit === "string" ? unit : "";
  }
}

function summarizeScalar(configuration: JsonRecord) {
  const value = formatNumber(configuration.value);
  if (value === null) return null;
  const unit = humanizeUnit(configuration.unit);
  return [value, unit].filter(Boolean).join(" ");
}

function summarizeParameters(configuration: JsonRecord) {
  if (!isRecord(configuration.parameters)) return null;

  const entries = Object.entries(configuration.parameters)
    .map(([key, raw]) => {
      if (!isRecord(raw)) return null;
      const value = formatNumber(raw.value);
      if (value === null) return null;
      const unit = humanizeUnit(raw.unit);
      const label = key
        .replaceAll("_", " ")
        .replace("per kg", "por kg")
        .replace("daily", "diário");
      return `${label}: ${[value, unit].filter(Boolean).join(" ")}`;
    })
    .filter((value): value is string => Boolean(value));

  return entries.length > 0 ? entries.join(" · ") : null;
}

function summarizeConfiguration(configuration: unknown) {
  if (!isRecord(configuration)) return "Configuração ativa";

  return (
    summarizeScalar(configuration) ??
    summarizeParameters(configuration) ??
    "Configuração ativa versionada"
  );
}

export async function loadMethodConfigurationOverview(): Promise<
  MethodConfigurationOverviewItem[]
> {
  const supabase = await createClient();

  const { data: templates, error: templatesError } = await supabase
    .from("method_configuration_templates")
    .select(
      "id, template_key, domain_key, config_schema_key, display_name, description",
    )
    .order("domain_key")
    .order("display_name");

  if (templatesError) throw templatesError;

  const { data: versions, error: versionsError } = await supabase
    .from("method_configuration_versions")
    .select(
      "id, template_id, version_number, schema_version, configuration, source_kind, activated_at",
    )
    .not("activated_at", "is", null)
    .is("retired_at", null);

  if (versionsError) throw versionsError;

  const versionsByTemplate = new Map(
    (versions ?? []).map((version) => [version.template_id, version]),
  );

  const items = (templates ?? []).flatMap((template) => {
    const version = versionsByTemplate.get(template.id);
    if (!version || !version.activated_at) return [];

    return [
      {
        templateId: template.id,
        templateKey: template.template_key,
        domainKey: template.domain_key,
        schemaKey: template.config_schema_key,
        displayName: template.display_name,
        description: template.description,
        versionId: version.id,
        versionNumber: version.version_number,
        schemaVersion: version.schema_version,
        sourceKind: version.source_kind,
        activatedAt: version.activated_at,
        summary: summarizeConfiguration(version.configuration),
      },
    ];
  });

  return items;
}
