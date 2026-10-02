import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function finalizeAssessmentWithMethodSnapshot(input: {
  assessmentId: string;
  finalizedByProfileId: string;
  catalogTemplateVersionId: string;
  catalogConfiguration: Json;
  catalogResultValues: Json;
  definitionTemplateVersionId: string;
  definitionConfiguration: Json;
  definitionResultValues: Json;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "finalize_assessment_from_method_snapshot",
    {
      p_assessment_id: input.assessmentId,
      p_finalized_by_profile_id: input.finalizedByProfileId,
      p_catalog_template_version_id: input.catalogTemplateVersionId,
      p_catalog_configuration: input.catalogConfiguration,
      p_catalog_result_values: input.catalogResultValues,
      p_definition_template_version_id: input.definitionTemplateVersionId,
      p_definition_configuration: input.definitionConfiguration,
      p_definition_result_values: input.definitionResultValues,
    },
  );

  if (error) throw error;
  if (!data) {
    throw new Error("Assessment snapshot finalization returned no snapshot set");
  }

  return data;
}
