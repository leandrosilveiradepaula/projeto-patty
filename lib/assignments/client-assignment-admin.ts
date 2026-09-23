import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function endCurrentAdminClientAssignments(input: {
  clientId: string;
  staffProfileId: string;
}) {
  const admin = createAdminClient();
  const endedAt = new Date().toISOString();

  const { data, error } = await admin
    .from("client_assignments")
    .update({ ended_at: endedAt })
    .eq("client_id", input.clientId)
    .eq("staff_profile_id", input.staffProfileId)
    .is("ended_at", null)
    .select("id");

  if (error) {
    throw error;
  }

  return {
    endedAt,
    endedAssignmentIds: data.map((assignment) => assignment.id),
  };
}
