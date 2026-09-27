import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientRegistrationInput } from "@/lib/clients/registration";

export async function upsertClientRegistrationPrivileged(input: {
  clientId: string;
  registration: ClientRegistrationInput;
}) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("client_registration")
    .upsert(
      {
        client_id: input.clientId,
        city: input.registration.city,
        contact_email: input.registration.contactEmail,
        instagram: input.registration.instagram,
        phone: input.registration.phone,
        updated_at: now,
      },
      { onConflict: "client_id" },
    )
    .select(
      "client_id, city, phone, contact_email, instagram, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}
