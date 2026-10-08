import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// The profile trigger synchronizes the canonical client name for linked identities.
// A returned row is required: PostgREST updates can succeed with zero affected rows.
export async function updateClientProfileDisplayNamePrivileged(input: {
  displayName: string;
  profileId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ display_name: input.displayName })
    .eq("id", input.profileId)
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Client profile name update was not confirmed");
  }

  return data;
}

// A client without an Auth profile still owns a canonical professional name.
// The profile_id postcondition prevents rewriting a client linked concurrently.
export async function updateStandaloneClientFullNamePrivileged(input: {
  clientId: string;
  displayName: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .update({ full_name: input.displayName })
    .eq("id", input.clientId)
    .is("profile_id", null)
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Standalone client name update was not confirmed");
  }

  return data;
}
