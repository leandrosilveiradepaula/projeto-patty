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

  return {
    endedAt,
    endedAssignmentIds: data.map((assignment) => assignment.id),
  };
}
