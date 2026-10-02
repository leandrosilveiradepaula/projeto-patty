import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createLiquidIntakeWithMethodSnapshot(input: {
  amountMl: number;
  clientId: string;
  liquidKind: string;
  recordedByProfileId: string;
  templateVersionId: string;
  resolvedConfiguration: Json;
  resultValues: Json;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "create_liquid_intake_event_from_method_snapshot",
    {
      p_amount_ml: input.amountMl,
      p_client_id: input.clientId,
      p_liquid_kind: input.liquidKind,
      p_recorded_by_profile_id: input.recordedByProfileId,
      p_resolved_configuration: input.resolvedConfiguration,
      p_result_values: input.resultValues,
      p_template_version_id: input.templateVersionId,
    },
  );

  if (error) throw error;
  if (!data) {
    throw new Error("Liquid snapshot persistence returned no event id");
  }

  return data;
}
