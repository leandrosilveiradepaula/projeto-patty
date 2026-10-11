import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  clientRegistrationSnapshotFromRow,
  equalClientRegistration,
  hasClientRegistrationValues,
  type ClientRegistrationInput,
} from "@/lib/clients/registration";

/**
 * The caller must authorize the exact client before this privileged operation.
 * A stale page never gets to overwrite the saved values. No RLS grant changes.
 */
export class ClientRegistrationConflictError extends Error {
  constructor() {
    super("O Cadastro Atual foi alterado por outra sessão.");
    this.name = "ClientRegistrationConflictError";
  }
}

export async function upsertClientRegistrationPrivileged(input: {
  clientId: string;
  expectedUpdatedAt: string | null;
  registration: ClientRegistrationInput;
}) {
  const supabase = createAdminClient();
  const { data: current, error: readError } = await supabase
    .from("client_registration")
    .select("client_id, city, phone, contact_email, instagram, created_at, updated_at")
    .eq("client_id", input.clientId)
    .maybeSingle();

  if (readError) throw readError;

  // Missing/created/updated are distinct versions. A lookup is only to detect
  // no-op writes; the subsequent UPDATE still uses an atomic timestamp filter.
  if ((current?.updated_at ?? null) !== input.expectedUpdatedAt) {
    throw new ClientRegistrationConflictError();
  }

  const savedValues = clientRegistrationSnapshotFromRow(current).values;
  if (equalClientRegistration(savedValues, input.registration) ||
    (!current && !hasClientRegistrationValues(input.registration))) {
    return { registration: current, status: "unchanged" as const };
  }

  const values = {
    city: input.registration.city,
    contact_email: input.registration.contactEmail,
    instagram: input.registration.instagram,
    phone: input.registration.phone,
    updated_at: new Date().toISOString(),
  };

  if (input.expectedUpdatedAt === null) {
    // Insert only for an absent row; a concurrent first write fails on PK.
    const { data, error } = await supabase
      .from("client_registration")
      .insert({ client_id: input.clientId, ...values })
      .select("client_id, city, phone, contact_email, instagram, created_at, updated_at")
      .single();

    if (error?.code === "23505") throw new ClientRegistrationConflictError();
    if (error) throw error;
    return { registration: data, status: "saved" as const };
  }

  const { data, error } = await supabase
    .from("client_registration")
    .update(values)
    .eq("client_id", input.clientId)
    .eq("updated_at", input.expectedUpdatedAt)
    .select("client_id, city, phone, contact_email, instagram, created_at, updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ClientRegistrationConflictError();
  return { registration: data, status: "saved" as const };
}
