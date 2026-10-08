import "server-only";

import { startCurrentAdminClientAssignment } from "@/lib/assignments/client-assignment-start";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";

export type ClientInvitationProvisionErrorCode =
  | "cleanup_failed"
  | "invite_failed"
  | "link_failed"
  | "provision_failed"
  | "identity_reconciliation_required";

export class ClientInvitationProvisionError extends Error {
  constructor(public readonly code: ClientInvitationProvisionErrorCode) {
    super(code);
    this.name = "ClientInvitationProvisionError";
  }
}

/**
 * Compensate only relational rows successfully INSERTed by this invocation.
 * Auth identities and older clients must never be deleted on the strength of
 * a userId returned by an invite/generateLink API call: it may refer to an
 * existing user. A possible orphan Auth identity requires explicit review.
 */
async function cleanupFailedProvision(input: {
  clientId: string | null;
  profileCreated: boolean;
  roleCreated: boolean;
  staffProfileId: string;
  userId: string;
}) {
  const admin = createAdminClient();

  if (input.clientId) {
    const assignmentCleanup = await admin
      .from("client_assignments")
      .delete()
      .eq("client_id", input.clientId)
      .eq("staff_profile_id", input.staffProfileId);

    if (assignmentCleanup.error) return false;

    const { data, error } = await admin
      .from("clients")
      .delete()
      .eq("id", input.clientId)
      .eq("profile_id", input.userId)
      .select("id")
      .single();

    // Do not delete the profile if its client could not be removed; the FK
    // would otherwise detach a professional record from its identity.
    if (error || !data) return false;
  }

  if (input.roleCreated) {
    const { data, error } = await admin
      .from("user_roles")
      .delete()
      .eq("profile_id", input.userId)
      .eq("role", "client")
      .select("profile_id")
      .single();
    if (error || !data) return false;
  }

  if (input.profileCreated) {
    const { data, error } = await admin
      .from("profiles")
      .delete()
      .eq("id", input.userId)
      .select("id")
      .single();
    if (error || !data) return false;
  }

  // Never delete an Auth user here: the returned identity may predate the invite.
  return true;
}

async function provisionInvitedUser(input: {
  displayName: string;
  staffProfileId: string;
  userId: string;
}) {
  const displayName = input.displayName.trim();

  if (displayName.length < 2 || displayName.length > 120) {
    throw new ClientInvitationProvisionError("provision_failed");
  }

  const admin = createAdminClient();
  let clientId: string | null = null;
  let profileCreated = false;
  let roleCreated = false;

  try {
    const profile = await admin
      .from("profiles")
      .insert({ id: input.userId, display_name: displayName })
      .select("id")
      .single();

    if (profile.error) {
      throw profile.error;
    }
    profileCreated = true;

    const role = await admin.from("user_roles").insert({
      profile_id: input.userId,
      role: "client",
    });

    if (role.error) {
      throw role.error;
    }
    roleCreated = true;

    const client = await admin
      .from("clients")
      .insert({ full_name: displayName, profile_id: input.userId, status: "active" })
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
      profileCreated,
      roleCreated,
      staffProfileId: input.staffProfileId,
      userId: input.userId,
    });

    // Even when newly inserted relational rows were compensated, a user may
    // remain in Supabase Auth. Never claim the account was fully undone.
    throw new ClientInvitationProvisionError(
      cleaned ? "identity_reconciliation_required" : "cleanup_failed",
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
    // A returned user is not evidence that generateLink created a new user.
    // Never delete it; require reconciliation if the identity is uncertain.
    throw new ClientInvitationProvisionError(
      user ? "identity_reconciliation_required" : "link_failed",
    );
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
