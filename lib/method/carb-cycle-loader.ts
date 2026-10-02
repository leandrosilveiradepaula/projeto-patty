import "server-only";

import {
  parseCarbCycleConfiguration,
  type CarbCycleConfiguration,
} from "./carb-cycle";
import { createClient } from "@/lib/supabase/server";

const CONFIG_SCHEMA_KEY = "carb_cycle_v1";

export type LoadedCarbCycleConfiguration = {
  configuration: CarbCycleConfiguration;
  templateId: string;
  templateVersionId: string;
};

export async function loadCarbCycleConfiguration(
  phaseKey: "phase_1" | "phase_2" | "phase_3",
): Promise<LoadedCarbCycleConfiguration> {
  const supabase = await createClient();
  const templateKey = "nutrition.carb_cycle." + phaseKey;

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, config_schema_key")
    .eq("template_key", templateKey)
    .maybeSingle();

  if (templateError) throw templateError;
  if (!template) throw new Error("Carb Cycle configuration template is missing");
  if (template.config_schema_key !== CONFIG_SCHEMA_KEY) {
    throw new Error("Carb Cycle configuration schema is unsupported");
  }

  const { data: versions, error: versionError } = await supabase
    .from("method_configuration_versions")
    .select("id, configuration")
    .eq("template_id", template.id)
    .not("activated_at", "is", null)
    .is("retired_at", null)
    .limit(2);

  if (versionError) throw versionError;
  if (!versions || versions.length !== 1) {
    throw new Error("Carb Cycle configuration must have exactly one active version");
  }

  const version = versions[0];

  return {
    configuration: parseCarbCycleConfiguration(version.configuration),
    templateId: template.id,
    templateVersionId: version.id,
  };
}
