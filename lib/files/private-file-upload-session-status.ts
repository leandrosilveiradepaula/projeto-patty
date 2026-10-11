import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";
import type { PrivateFileUploadSessionStatus } from "@/lib/files/private-file-upload-recovery-state";

/**
 * Read-only recovery. Uses the caller's authenticated Supabase session and
 * current RLS; never returns object paths, signed tokens or file contents.
 */
export async function readPrivateFileUploadSessionStatus(input: {
  actorProfileId: string;
  clientId: string;
  sessionId: string;
}): Promise<{ status: PrivateFileUploadSessionStatus }> {
  if (!isUuid(input.sessionId) || !isUuid(input.clientId) || !isUuid(input.actorProfileId)) {
    return { status: "unavailable" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_file_upload_sessions")
    .select("status")
    .eq("id", input.sessionId)
    .eq("client_id", input.clientId)
    .eq("requester_profile_id", input.actorProfileId)
    .maybeSingle();

  if (error) throw error;

  switch (data?.status) {
    case "pending":
    case "validating":
    case "accepted":
    case "rejected":
    case "expired":
      return { status: data.status };
    default:
      return { status: "unavailable" };
  }
}
