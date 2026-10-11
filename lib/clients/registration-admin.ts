import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientRegistrationInput } from "@/lib/clients/registration";

/**
 * A client and a professional can edit the same Cadastro Atual.
 * The caller must first resolve and authorize the exact client. This privileged
 * function only performs the version-checked write, never authorization.
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
  const values = {
    city: input.registration.city,
    contact_email: input.registration.contactEmail,
    instagram: input.registration.instagram,
    phone: input.registration.phone,
    updated_at: new Date().toISOString(),
  };

  if (input.expectedUpdatedAt === null) {
    // If another actor created the first record, INSERT fails on client_id's
    // existing primary key instead of overwriting that actor's saved data.
    const { data, error } = await supabase
      .from("client_registration")
      .insert({ client_id: input.clientId, ...values })
      .select("client_id, city, phone, contact_email, instagram, created_at, updated_at")
      .single();

    if (error?.code === "23505") throw new ClientRegistrationConflictError();
    if (error) throw error;
    return data;
  }

  // One atomic compare-and-update; a separate SELECT followed by UPDATE would
  // still lose concurrent changes. No deletion or history rewrite occurs.
  const { data, error } = await supabase
    .from("client_registration")
    .update(values)
    .eq("client_id", input.clientId)
    .eq("updated_at", input.expectedUpdatedAt)
    .select("client_id, city, phone, contact_email, instagram, created_at, updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ClientRegistrationConflictError();
  return data;
}
