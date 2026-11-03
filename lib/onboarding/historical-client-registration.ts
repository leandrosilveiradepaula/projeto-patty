import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/auth";

export async function createHistoricalClientInternal(input: {
  requestId: string;
  fullName: string;
  duplicateReviewConfirmed: boolean;
}) {
  await requireRole("admin");
  const supabase = await createClient();
  // The session RPC, not a service-role client, enforces relational admin AAL2
  // and writes the Client + audit request in a single transaction.
  const { data, error } = await supabase.rpc("create_historical_client_internal", {
    p_request_id: input.requestId,
    p_full_name: input.fullName,
    p_confirmed_no_existing_client: input.duplicateReviewConfirmed,
  });
  if (error) throw error;
  return data;
}
