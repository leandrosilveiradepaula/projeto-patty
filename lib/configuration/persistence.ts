import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function activateMethodConfigurationVersion(input: {
  actorProfileId: string;
  configuration: Json;
  expectedActiveVersionId: string;
  sourceReference: string;
  templateId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "activate_method_configuration_version_server",
    {
      p_actor_profile_id: input.actorProfileId,
      p_configuration: input.configuration,
      p_expected_active_version_id: input.expectedActiveVersionId,
      p_source_reference: input.sourceReference,
      p_template_id: input.templateId,
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Method configuration activation returned no version id");
  }

  return data;
}
