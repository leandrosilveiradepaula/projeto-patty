import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function updateClientProfileDisplayNamePrivileged(input: {
  displayName: string;
  profileId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ display_name: input.displayName })
    .eq("id", input.profileId);

  if (error) {
    throw error;
  }
}
