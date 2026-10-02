import "server-only";

import { resolveHydrationTarget } from "./hydration-resolution.ts";
import { createClient } from "../supabase/server";

export type LoadedHydrationTargetResolution = {
  clientOverrideVersionId: string | null;
  configuration: ReturnType<typeof resolveHydrationTarget>["configuration"];
  targetMl: number;
  templateId: string;
  templateVersionId: string;
};

export async function loadHydrationTargetResolution(
  clientId: string,
  weightKg: number,
): Promise<LoadedHydrationTargetResolution> {
  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    throw clientError;
  }

  if (!client) {
    throw new Error(
      "Hydration target client is not accessible to the current admin",
    );
  }

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, template_key, config_schema_key")
    .eq("template_key", "hydration.daily_target")
    .eq("config_schema_key", "method_engine_v1")
    .maybeSingle();

  if (templateError) {
    throw templateError;
  }

  if (!template) {
    throw new Error("Active hydration template identity is unavailable");
  }

  const { data: versions, error: versionsError } = await supabase
    .from("method_configuration_versions")
    .select("id, configuration")
    .eq("template_id", template.id)
    .not("activated_at", "is", null)
    .is("retired_at", null)
    .order("version_number", { ascending: false })
    .limit(2);

  if (versionsError) {
    throw versionsError;
  }

  if (versions.length !== 1) {
    throw new Error(
      "Hydration template must have exactly one active version",
    );
  }

  const templateVersion = versions[0];

  const { data: overrides, error: overridesError } = await supabase
    .from("client_method_configuration_override_versions")
    .select("id, override_configuration")
    .eq("client_id", clientId)
    .eq("template_id", template.id)
    .eq("based_on_template_version_id", templateVersion.id)
    .is("protocol_version_id", null)
    .not("activated_at", "is", null)
    .is("retired_at", null)
    .order("version_number", { ascending: false })
    .limit(2);

  if (overridesError) {
    throw overridesError;
  }

  if (overrides.length > 1) {
    throw new Error(
      "Hydration target has more than one active client override",
    );
  }

  const clientOverride = overrides[0] ?? null;
  const resolution = resolveHydrationTarget(
    templateVersion.configuration,
    weightKg,
    clientOverride?.override_configuration,
  );

  return {
    clientOverrideVersionId: clientOverride?.id ?? null,
    configuration: resolution.configuration,
    targetMl: resolution.targetMl,
    templateId: template.id,
    templateVersionId: templateVersion.id,
  };
}
