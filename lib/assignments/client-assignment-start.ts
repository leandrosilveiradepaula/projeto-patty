import "server-only";

import { getAssignmentStartStatus } from "@/lib/assignments/start-policy";
import { createAdminClient } from "@/lib/supabase/admin";

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
  staffProfileId: string;
}): Promise<StartClientAssignmentResult> {
  const existingAssignmentId = await getActiveAssignmentId(input);

  if (getAssignmentStartStatus(existingAssignmentId) === "already_active") {
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
      staff_profile_id: input.staffProfileId,
    })
    .select("id")
    .single();

  if (!error) {
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
    const concurrentAssignmentId = await getActiveAssignmentId(input);

    if (concurrentAssignmentId) {
      return {
        assignmentId: concurrentAssignmentId,
        status: "already_active",
      };
    }
  }

  throw error;
}
