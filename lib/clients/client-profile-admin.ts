import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** A zero-row conditional update means the name changed in another session. */
export class ClientNameConflictError extends Error {
  constructor() {
    super("O nome da cliente foi alterado em outra sessão.");
    this.name = "ClientNameConflictError";
  }
}

/**
 * A linked client has a canonical full_name synchronized by the existing
 * profile trigger. Compare the loaded profile name atomically before writing.
 */
export async function updateClientProfileDisplayNamePrivileged(input: {
  displayName: string;
  expectedDisplayName: string | null;
  profileId: string;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .update({ display_name: input.displayName })
    .eq("id", input.profileId);
  query = input.expectedDisplayName === null
    ? query.is("display_name", null)
    : query.eq("display_name", input.expectedDisplayName);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw error;
  if (!data) throw new ClientNameConflictError();
  return data;
}

/** Keep an unlinked Client as canonical and reject links/edits made mid-save. */
export async function updateStandaloneClientFullNamePrivileged(input: {
  clientId: string;
  displayName: string;
  expectedFullName: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .update({ full_name: input.displayName })
    .eq("id", input.clientId)
    .eq("full_name", input.expectedFullName)
    .is("profile_id", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ClientNameConflictError();
  return data;
}
