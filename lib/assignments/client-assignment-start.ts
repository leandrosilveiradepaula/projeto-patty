import "server-only";

import { getAssignmentStartStatus } from "@/lib/assignments/start-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";
import { isUuid } from "@/lib/validation/uuid";

async function markClientActive(clientId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ status: "active" })
    .eq("id", clientId);

  if (error) {
    throw error;
  }
}

export type StartClientAssignmentResult =
  | {
      assignmentId: string;
      status: "already_active";
    }
  | {
      assignmentId: string;
      status: "created";
    };

async function getActiveAssignmentId(input: {
  clientId: string;
  staffProfileId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_assignments")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("staff_profile_id", input.staffProfileId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function startCurrentAdminClientAssignment(input: {
  clientId: string;
}): Promise<StartClientAssignmentResult> {
  const auth = await requireRole("admin");

  if (!isUuid(input.clientId)) {
    throw new Error("Invalid client id");
  }

  const scopedInput = {
    clientId: input.clientId,
    staffProfileId: auth.profileId,
  };
  const existingAssignmentId = await getActiveAssignmentId(scopedInput);

  if (getAssignmentStartStatus(existingAssignmentId) === "already_active") {
    await markClientActive(input.clientId);

    return {
      assignmentId: existingAssignmentId as string,
      status: "already_active",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_assignments")
    .insert({
      client_id: input.clientId,
      staff_profile_id: auth.profileId,
    })
    .select("id")
    .single();

  if (!error) {
    await markClientActive(input.clientId);

    return {
      assignmentId: data.id,
      status: "created",
    };
  }

  // The partial unique index is the database authority for one active
  // assignment per Patty/client pair. A concurrent request may win the race
  // between the read above and this insert; in that case, resolve the now
  // active row and return an idempotent result.
  if (error.code === "23505") {
    const concurrentAssignmentId = await getActiveAssignmentId(scopedInput);

    if (concurrentAssignmentId) {
      await markClientActive(input.clientId);

      return {
        assignmentId: concurrentAssignmentId,
        status: "already_active",
      };
    }
  }

  throw error;
}
