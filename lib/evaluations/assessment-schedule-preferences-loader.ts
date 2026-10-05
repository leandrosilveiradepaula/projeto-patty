import "server-only";

import {
  parseAssessmentSchedulePreferencesConfiguration,
  type AssessmentSchedulePreferencesConfiguration,
} from "@/lib/configuration/assessment-schedule-preferences";
import { createClient } from "@/lib/supabase/server";

export type LoadedAssessmentSchedulePreferences = {
  configuration: AssessmentSchedulePreferencesConfiguration;
  templateId: string;
  templateVersionId: string;
};

export async function loadAssessmentSchedulePreferences(): Promise<
  LoadedAssessmentSchedulePreferences
> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("method_configuration_templates")
    .select("id, config_schema_key")
    .eq("template_key", "evaluation.assessment_schedule_preferences")
    .maybeSingle();

  if (templateError) throw templateError;
  if (!template) {
    throw new Error("Assessment schedule preference template is missing");
  }

  if (template.config_schema_key !== "assessment_schedule_preferences_v1") {
    throw new Error("Assessment schedule preference schema is unsupported");
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
    throw new Error(
      "Assessment schedule preferences must have exactly one active version",
    );
  }

  return {
    configuration: parseAssessmentSchedulePreferencesConfiguration(
      versions[0].configuration,
    ),
    templateId: template.id,
    templateVersionId: versions[0].id,
  };
}
