import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";

export async function createHistoricalClientInternal(input: {
  requestId: string;
  fullName: string;
  duplicateReviewConfirmed: boolean;
}) {
  const context = await requireRole("admin");
  // No browser-accessible key or session may invoke this privileged RPC.
  // The server verifies current relational role + MFA AAL2 before using
  // the service-role client. The RPC rechecks the actor's relational role.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_historical_client_internal", {
    p_request_id: input.requestId,
    p_full_name: input.fullName,
    p_confirmed_no_existing_client: input.duplicateReviewConfirmed,
    p_created_by_profile_id: context.profileId,
  });
  if (error) throw error;
  if (!data) throw new Error("Historical Client creation returned no Client ID");
  return data;
}
