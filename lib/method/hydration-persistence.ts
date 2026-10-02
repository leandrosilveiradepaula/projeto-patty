import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

import type { LoadedHydrationTargetResolution } from "./hydration-loader.ts";

export async function persistConfiguredHydrationTarget(input: {
  clientId: string;
  createdByProfileId: string;
  resolution: LoadedHydrationTargetResolution;
  weightKg: number;
}) {
  const supabase = createAdminClient();
  const resultValues: Json = {
    target_ml: {
      unit: "ml",
      value: input.resolution.targetMl,
    },
  };

  const { data: hydrationTargetId, error } = await supabase.rpc(
    "create_hydration_target_from_method_snapshot",
    {
      p_client_id: input.clientId,
      p_created_by_profile_id: input.createdByProfileId,
      p_override_version_id:
        input.resolution.clientOverrideVersionId ?? undefined,
      p_resolved_configuration: input.resolution.configuration as Json,
      p_resolved_target_ml: input.resolution.targetMl,
      p_result_values: resultValues,
      p_template_version_id: input.resolution.templateVersionId,
      p_weight_kg: input.weightKg,
    },
  );

  if (error) {
    throw error;
  }

  if (!hydrationTargetId) {
    throw new Error("Configured hydration target persistence returned no id");
  }

  return hydrationTargetId;
}
