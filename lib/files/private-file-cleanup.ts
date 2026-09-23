import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const PRIVATE_FILE_BUCKET = "client-private";
const DEFAULT_BATCH_SIZE = 100;

export type PrivateFileUploadCleanupResult = {
  expiredSessionsMarked: number;
  objectsRemoved: number;
  scannedSessions: number;
};

export async function cleanupExpiredClientFileUploadSessions(input?: {
  batchSize?: number;
  now?: Date;
}): Promise<PrivateFileUploadCleanupResult> {
  const admin = createAdminClient();
  const nowIso = (input?.now ?? new Date()).toISOString();
  const batchSize = Math.min(
    Math.max(input?.batchSize ?? DEFAULT_BATCH_SIZE, 1),
    500,
  );

  const { data: sessions, error: sessionsError } = await admin
    .from("client_file_upload_sessions")
    .select("id, temp_object_path, status")
    .in("status", ["pending", "expired"])
    .lte("expires_at", nowIso)
    .order("expires_at", { ascending: true })
    .limit(batchSize);

  if (sessionsError) {
    throw sessionsError;
  }

  let expiredSessionsMarked = 0;
  const objectPaths = new Set<string>();

  for (const session of sessions ?? []) {
    if (
      typeof session.temp_object_path !== "string" ||
      !session.temp_object_path.startsWith("pending/")
    ) {
      throw new Error("Unsafe temporary upload path");
    }

    if (session.status === "pending") {
      const { data: expiredSession, error: expireError } = await admin
        .from("client_file_upload_sessions")
        .update({ status: "expired" })
        .eq("id", session.id)
        .eq("status", "pending")
        .lte("expires_at", nowIso)
        .select("id")
        .maybeSingle();

      if (expireError) {
        throw expireError;
      }

      if (!expiredSession) {
        continue;
      }

      expiredSessionsMarked += 1;
    }

    objectPaths.add(session.temp_object_path);
  }

  if (objectPaths.size > 0) {
    const paths = [...objectPaths];
    const { error: removeError } = await admin.storage
      .from(PRIVATE_FILE_BUCKET)
      .remove(paths);

    if (removeError) {
      throw removeError;
    }
  }

  return {
    expiredSessionsMarked,
    objectsRemoved: objectPaths.size,
    scannedSessions: sessions?.length ?? 0,
  };
}
