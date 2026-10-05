import "server-only";

import { startCurrentAdminClientAssignment } from "@/lib/assignments/client-assignment-start";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";

export type ClientInvitationProvisionErrorCode =
  | "cleanup_failed"
  | "invite_failed"
  | "link_failed"
  | "provision_failed";

export class ClientInvitationProvisionError extends Error {
  constructor(public readonly code: ClientInvitationProvisionErrorCode) {
    super(code);
    this.name = "ClientInvitationProvisionError";
  }
}

async function cleanupFailedProvision(input: {
  clientId: string | null;
  staffProfileId: string;
  userId: string;
}) {
  const admin = createAdminClient();
  let clientId = input.clientId;
  let failed = false;

  if (!clientId) {
    const lookup = await admin
      .from("clients")
      .select("id")
      .eq("profile_id", input.userId)
      .maybeSingle();

    if (lookup.error) {
      failed = true;
    } else {
      clientId = lookup.data?.id ?? null;
    }
  }

  if (clientId) {
    const assignmentCleanup = await admin
      .from("client_assignments")
      .delete()
      .eq("client_id", clientId)
      .eq("staff_profile_id", input.staffProfileId);

    if (assignmentCleanup.error) {
      failed = true;
    }

    const clientCleanup = await admin
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (clientCleanup.error) {
      failed = true;
    }
  }

  const authCleanup = await admin.auth.admin.deleteUser(input.userId);

  if (authCleanup.error) {
    failed = true;
  }

  return !failed;
}

async function provisionInvitedUser(input: {
  displayName: string;
  staffProfileId: string;
  userId: string;
}) {
  const admin = createAdminClient();
  let clientId: string | null = null;

  try {
    const profile = await admin
      .from("profiles")
      .insert({ id: input.userId, display_name: input.displayName })
      .select("id")
      .single();

    if (profile.error) {
      throw profile.error;
    }

    const role = await admin.from("user_roles").insert({
      profile_id: input.userId,
      role: "client",
    });

    if (role.error) {
      throw role.error;
    }

    const client = await admin
      .from("clients")
      .insert({ profile_id: input.userId })
      .select("id")
      .single();

    if (client.error) {
      throw client.error;
    }

    clientId = client.data.id;

    await startCurrentAdminClientAssignment({
      clientId,
    });

    return {
      clientId,
      profileId: input.userId,
    };
  } catch {
    const cleaned = await cleanupFailedProvision({
      clientId,
      staffProfileId: input.staffProfileId,
      userId: input.userId,
    });

    throw new ClientInvitationProvisionError(
      cleaned ? "provision_failed" : "cleanup_failed",
    );
  }
}

export async function inviteAndProvisionClient(input: {
  displayName: string;
  email: string;
}) {
  const auth = await requireRole("admin");
  const admin = createAdminClient();
  const invitation = await admin.auth.admin.inviteUserByEmail(input.email);

  if (invitation.error || !invitation.data.user) {
    throw new ClientInvitationProvisionError("invite_failed");
  }

  return provisionInvitedUser({
    displayName: input.displayName,
    staffProfileId: auth.profileId,
    userId: invitation.data.user.id,
  });
}

export async function generateManualInviteAndProvisionClient(input: {
  displayName: string;
  email: string;
}) {
  const auth = await requireRole("admin");
  const admin = createAdminClient();
  const generated = await admin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
  });

  const user = generated.data?.user;
  const tokenHash = generated.data?.properties?.hashed_token;

  if (generated.error || !user || !tokenHash) {
    if (user) {
      await admin.auth.admin.deleteUser(user.id);
    }
    throw new ClientInvitationProvisionError("link_failed");
  }

  const provisioned = await provisionInvitedUser({
    displayName: input.displayName,
    staffProfileId: auth.profileId,
    userId: user.id,
  });

  return {
    ...provisioned,
    tokenHash,
  };
}
