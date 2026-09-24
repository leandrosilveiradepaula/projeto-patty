import "server-only";

import { getCurrentClient } from "@/lib/supabase/data-access";
import { requireRoleIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

export type AnamnesisSubmissionErrorCode =
  | "client_not_found"
  | "draft_not_found"
  | "incomplete_or_invalid_answers"
  | "invalid_identifier";

export class AnamnesisSubmissionError extends Error {
  constructor(public readonly code: AnamnesisSubmissionErrorCode) {
    super(code);
    this.name = "AnamnesisSubmissionError";
  }
}

export async function submitCurrentClientAnamnesisDraft(submissionId: string) {
  if (!isUuid(submissionId)) {
    throw new AnamnesisSubmissionError("invalid_identifier");
  }

  const auth = await requireRoleIdentity("client");
  const client = await getCurrentClient();

  if (!client || client.profile_id !== auth.profileId) {
    throw new AnamnesisSubmissionError("client_not_found");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_submissions")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("client_id", client.id)
    .is("submitted_at", null)
    .select("id, client_id, form_version_id, submitted_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23514") {
      throw new AnamnesisSubmissionError("incomplete_or_invalid_answers");
    }

    throw error;
  }

  if (!data) {
    throw new AnamnesisSubmissionError("draft_not_found");
  }

  return data;
}
