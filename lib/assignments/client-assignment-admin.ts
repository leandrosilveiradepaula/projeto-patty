import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";
import { isUuid } from "@/lib/validation/uuid";

export async function endCurrentAdminClientAssignments(input: {
  clientId: string;
}) {
  const auth = await requireRole("admin");

  if (!isUuid(input.clientId)) {
    throw new Error("Invalid client id");
  }

  const admin = createAdminClient();
  const endedAt = new Date().toISOString();

  const { data, error } = await admin
    .from("client_assignments")
    .update({ ended_at: endedAt })
    .eq("client_id", input.clientId)
    .eq("staff_profile_id", auth.profileId)
    .is("ended_at", null)
    .select("id");

  if (error) {
    throw error;
  }

  const { data: remainingAssignments, error: remainingAssignmentsError } =
    await admin
      .from("client_assignments")
      .select("id")
      .eq("client_id", input.clientId)
      .is("ended_at", null)
      .limit(1);

  if (remainingAssignmentsError) {
    throw remainingAssignmentsError;
  }

  if (data.length > 0 && remainingAssignments.length === 0) {
    const { error: clientStatusError } = await admin
      .from("clients")
      .update({ status: "inactive" })
      .eq("id", input.clientId);

    if (clientStatusError) {
      throw clientStatusError;
    }
  }

  return {
    endedAt,
    endedAssignmentIds: data.map((assignment) => assignment.id),
  };
}
