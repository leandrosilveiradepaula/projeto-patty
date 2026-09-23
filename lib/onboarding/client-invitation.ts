import "server-only";

import { startCurrentAdminClientAssignment } from "@/lib/assignments/client-assignment-start";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClientInvitationProvisionErrorCode =
  | "cleanup_failed"
  | "invite_failed"
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

export async function inviteAndProvisionClient(input: {
  email: string;
  staffProfileId: string;
}) {
  const admin = createAdminClient();
  const invitation = await admin.auth.admin.inviteUserByEmail(input.email);

  if (invitation.error || !invitation.data.user) {
    throw new ClientInvitationProvisionError("invite_failed");
  }

  const userId = invitation.data.user.id;
  let clientId: string | null = null;

  try {
    const profile = await admin
      .from("profiles")
      .insert({ id: userId })
      .select("id")
      .single();

    if (profile.error) {
      throw profile.error;
    }

    const role = await admin.from("user_roles").insert({
      profile_id: userId,
      role: "client",
    });

    if (role.error) {
      throw role.error;
    }

    const client = await admin
      .from("clients")
      .insert({ profile_id: userId })
      .select("id")
      .single();

    if (client.error) {
      throw client.error;
    }

    clientId = client.data.id;

    await startCurrentAdminClientAssignment({
      clientId,
      staffProfileId: input.staffProfileId,
    });

    return {
      clientId,
      profileId: userId,
    };
  } catch {
    const cleaned = await cleanupFailedProvision({
      clientId,
      staffProfileId: input.staffProfileId,
      userId,
    });

    throw new ClientInvitationProvisionError(
      cleaned ? "provision_failed" : "cleanup_failed",
    );
  }
}
