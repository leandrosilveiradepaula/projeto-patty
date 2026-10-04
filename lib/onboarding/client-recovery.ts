import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export class ClientRecoveryLinkError extends Error {
  constructor(public readonly code: "identity_missing" | "recovery_link_failed") {
    super(code);
    this.name = "ClientRecoveryLinkError";
  }
}

export async function generateClientRecoveryToken(input: {
  profileId: string;
}) {
  const admin = createAdminClient();
  const userResult = await admin.auth.admin.getUserById(input.profileId);
  const email = userResult.data.user?.email?.trim();

  if (userResult.error || !email) {
    throw new ClientRecoveryLinkError("identity_missing");
  }

  const generated = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  const tokenHash = generated.data?.properties?.hashed_token;

  if (generated.error || !tokenHash) {
    throw new ClientRecoveryLinkError("recovery_link_failed");
  }

  return { tokenHash };
}
