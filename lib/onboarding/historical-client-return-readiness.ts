import "server-only";

import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";
import {
  previewHistoricalClientReturn,
  type HistoricalClientSnapshot,
  type HistoricalReturnPreflight,
} from "@/lib/onboarding/historical-client-return-preflight";

export type HistoricalReturnReadinessRequest = Readonly<{
  clientId: string;
  confirmedClientId: string | null;
  identityReviewedByHuman: boolean;
  proposedProfileId?: string | null;
}>;

/**
 * Read-only, authorized, current-state check. RLS still governs every query:
 * admin AAL2 can SELECT all Clients and assignments, including unassigned
 * historical records. This is not an identity proof or an activation grant.
 */
export async function inspectHistoricalClientReturnReadiness(
  input: HistoricalReturnReadinessRequest,
): Promise<HistoricalReturnPreflight> {
  await requireRole("admin");

  const proposedProfileId = input.proposedProfileId?.trim() || null;
  if (!isUuid(input.clientId)) {
    return previewHistoricalClientReturn({
      client_id: input.clientId,
      confirmed_client_id: input.confirmedClientId,
      identity_reviewed_by_human: input.identityReviewedByHuman,
      clients: [],
      active_assignment_client_ids: [],
      proposed_profile_id: proposedProfileId,
    });
  }

  const supabase = await createClient();
  const [clientResponse, assignmentsResponse] = await Promise.all([
    supabase.from("clients")
      .select("id, profile_id, status")
      .eq("id", input.clientId)
      .maybeSingle(),
    supabase.from("client_assignments")
      .select("client_id")
      .eq("client_id", input.clientId)
      .is("ended_at", null)
      .limit(1),
  ]);

  if (clientResponse.error || assignmentsResponse.error) {
    throw new Error("Historical return readiness could not refresh protected backend data");
  }

  const client = clientResponse.data;
  const clients: HistoricalClientSnapshot[] = client
    ? [{ client_id: client.id, profile_id: client.profile_id, status: client.status }]
    : [];

  // If an identity has been proposed, check whether another Client already
  // owns it. Do not use names, contact email or auth.users for relationships.
  if (proposedProfileId && isUuid(proposedProfileId)) {
    const { data: profileMatches, error } = await supabase.from("clients")
      .select("id, profile_id, status")
      .eq("profile_id", proposedProfileId)
      .limit(2);
    if (error) {
      throw new Error("Historical return readiness could not verify profile ownership");
    }
    for (const match of profileMatches ?? []) {
      if (match.id !== input.clientId) {
        clients.push({ client_id: match.id, profile_id: match.profile_id, status: match.status });
      }
    }
  }

  return previewHistoricalClientReturn({
    client_id: input.clientId,
    confirmed_client_id: input.confirmedClientId,
    identity_reviewed_by_human: input.identityReviewedByHuman,
    clients,
    active_assignment_client_ids: (assignmentsResponse.data ?? []).map((assignment) => assignment.client_id),
    proposed_profile_id: proposedProfileId,
  });
}
