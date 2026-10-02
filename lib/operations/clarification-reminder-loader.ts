import "server-only";

import { clarificationReminderIntervalHours } from "./clarification-reminder";
import { createClient } from "@/lib/supabase/server";

const TEMPLATE_KEY = "workflow.anamnesis_clarification_reminder";
const CONFIG_SCHEMA_KEY = "scalar_parameter_v1";

export type LoadedClarificationReminderInterval = {
  configuration: unknown;
  intervalHours: number;
  templateId: string;
  templateVersionId: string;
};

export async function loadClarificationReminderInterval(): Promise<
  LoadedClarificationReminderInterval
> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, config_schema_key")
    .eq("template_key", TEMPLATE_KEY)
    .maybeSingle();

  if (templateError) {
    throw templateError;
  }

  if (!template) {
    throw new Error("Clarification reminder configuration template is missing");
  }

  if (template.config_schema_key !== CONFIG_SCHEMA_KEY) {
    throw new Error("Clarification reminder configuration schema is unsupported");
  }

  const { data: versions, error: versionError } = await supabase
    .from("method_configuration_versions")
    .select("id, configuration")
    .eq("template_id", template.id)
    .not("activated_at", "is", null)
    .is("retired_at", null)
    .limit(2);

  if (versionError) {
    throw versionError;
  }

  if (!versions || versions.length !== 1) {
    throw new Error(
      "Clarification reminder configuration must have exactly one active version",
    );
  }

  const version = versions[0];
  const intervalHours = clarificationReminderIntervalHours(
    version.configuration,
  );

  return {
    configuration: version.configuration,
    intervalHours,
    templateId: template.id,
    templateVersionId: version.id,
  };
}
