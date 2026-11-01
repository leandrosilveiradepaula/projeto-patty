import { isUuid } from "../validation/uuid.ts";

/**
 * An offline, synthetic-only readiness preview. It does not verify identity,
 * grant access, reserve a client, or authorize a database/Auth mutation.
 * All snapshots must be independently refreshed by an authorized backend.
 */
export type HistoricalClientSnapshot = Readonly<{
  client_id: string;
  profile_id: string | null;
  status: "active" | "inactive";
}>;

export type HistoricalReturnPreflightInput = Readonly<{
  client_id: string;
  confirmed_client_id: string | null;
  identity_reviewed_by_human: boolean;
  clients: readonly HistoricalClientSnapshot[];
  active_assignment_client_ids: readonly string[];
  proposed_profile_id: string | null;
}>;

export type HistoricalReturnBlockReason =
  | "invalid_client_id"
  | "missing_human_identity_review"
  | "invalid_snapshot"
  | "duplicate_client"
  | "client_not_found"
  | "not_inactive"
  | "already_linked"
  | "active_assignment"
  | "invalid_profile_id"
  | "profile_already_used";

export type HistoricalReturnPreflight = Readonly<{
  mode: "dry_run";
  persistence: "none";
  status: "blocked" | "pending_authorized_backend_verification";
  client_id: string;
  reasons: readonly HistoricalReturnBlockReason[];
  next_step: "manual_review" | "authorized_identity_and_onboarding_verification";
}>;

/** No name/email matching, Auth calls, status change or assignment creation. */
export function previewHistoricalClientReturn(input: HistoricalReturnPreflightInput): HistoricalReturnPreflight {
  const reasons = new Set<HistoricalReturnBlockReason>();
  if (!isUuid(input.client_id) || input.confirmed_client_id !== input.client_id) {
    reasons.add("invalid_client_id");
  }
  if (input.identity_reviewed_by_human !== true) reasons.add("missing_human_identity_review");

  const validClients = new Map<string, HistoricalClientSnapshot>();
  const duplicateClientIds = new Set<string>();
  const linkedProfiles = new Map<string, string>();
  for (const client of input.clients) {
    if (!isUuid(client.client_id) ||
      (client.profile_id !== null && !isUuid(client.profile_id)) ||
      (client.status !== "active" && client.status !== "inactive")) {
      reasons.add("invalid_snapshot");
      continue;
    }
    if (validClients.has(client.client_id)) duplicateClientIds.add(client.client_id);
    validClients.set(client.client_id, client);
    if (client.profile_id) {
      const owner = linkedProfiles.get(client.profile_id);
      if (owner && owner !== client.client_id) reasons.add("invalid_snapshot");
      linkedProfiles.set(client.profile_id, client.client_id);
    }
  }
  if (duplicateClientIds.has(input.client_id)) reasons.add("duplicate_client");
  const client = validClients.get(input.client_id);
  if (!client) reasons.add("client_not_found");
  if (client && client.status !== "inactive") reasons.add("not_inactive");
  if (client && client.profile_id !== null) reasons.add("already_linked");

  if (input.active_assignment_client_ids.some(id => !isUuid(id))) reasons.add("invalid_snapshot");
  if (input.active_assignment_client_ids.includes(input.client_id)) reasons.add("active_assignment");

  if (input.proposed_profile_id !== null) {
    if (!isUuid(input.proposed_profile_id)) reasons.add("invalid_profile_id");
    else if (linkedProfiles.has(input.proposed_profile_id)) reasons.add("profile_already_used");
  }

  const orderedReasons = [...reasons].sort();
  return {
    mode: "dry_run",
    persistence: "none",
    status: orderedReasons.length ? "blocked" : "pending_authorized_backend_verification",
    client_id: input.client_id,
    reasons: orderedReasons,
    next_step: orderedReasons.length ? "manual_review" : "authorized_identity_and_onboarding_verification",
  };
}
