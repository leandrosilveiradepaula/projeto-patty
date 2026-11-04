import "server-only";

import { requireRole } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

/**
 * Audit an explicit administrative return request for the original Client.
 * This does not prove identity or create Auth, Profile, Client access,
 * active assignment, Cadastro Atual completion, or content publication.
 */
export async function registerHistoricalClientReturnRequest(input: {
  requestId: string;
  clientId: string;
  confirmedClientId: string;
  humanIdentityReviewDeclared: boolean;
}) {
  const admin = await requireRole("admin");

  if (!isUuid(input.requestId) || !isUuid(input.clientId) ||
      input.confirmedClientId !== input.clientId ||
      input.humanIdentityReviewDeclared !== true) {
    throw new Error("Historical return request requires explicit valid confirmation");
  }

  const service = createAdminClient();
  const { data, error } = await service.rpc("register_historical_client_return_request", {
    p_request_id: input.requestId,
    p_client_id: input.clientId,
    p_confirmed_client_id: input.confirmedClientId,
    p_human_identity_review_declared: input.humanIdentityReviewDeclared,
    p_requested_by_profile_id: admin.profileId,
  });
  if (error || data !== input.clientId) {
    throw new Error("Historical return request was not recorded");
  }
  return { clientId: data, status: "pending_onboarding" as const };
}

/** Server-only status lookup: no browser grants or clinical columns. */
export async function getHistoricalClientReturnRequestStatus(clientId: string):
  Promise<{ status: "requested"; requestedAt: string } | { status: "not_requested" | "unavailable" }> {
  await requireRole("admin");
  if (!isUuid(clientId)) throw new Error("Invalid historical Client ID");
  const service = createAdminClient();
  const { data, error } = await service
    .from("historical_client_return_requests")
    .select("requested_at")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) return { status: "unavailable" };
  return data
    ? { status: "requested", requestedAt: data.requested_at }
    : { status: "not_requested" };
}
