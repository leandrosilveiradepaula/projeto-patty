import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildPrivateFileObjectPath,
  detectPrivateFileMimeType,
  validatePrivateFile,
} from "@/lib/validation/private-files";

const PRIVATE_FILE_BUCKET = "client-private";

export type ClientFileFinalizationResult =
  | {
      fileId: string;
      status: "accepted";
    }
  | {
      reason: "expired" | "invalid_content";
      status: "rejected";
    };

async function removeObjectBestEffort(objectPath: string) {
  const admin = createAdminClient();
  await admin.storage.from(PRIVATE_FILE_BUCKET).remove([objectPath]);
}

async function rejectUploadSession(input: {
  sessionId: string;
  tempObjectPath: string;
}) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("client_file_upload_sessions")
    .update({ status: "rejected" })
    .eq("id", input.sessionId)
    .eq("status", "validating");

  if (error) {
    throw error;
  }

  await removeObjectBestEffort(input.tempObjectPath);
}

export async function finalizeClientFileUploadSession(input: {
  clientVisibleOnAccept: boolean;
  requesterProfileId: string;
  sessionId: string;
}): Promise<ClientFileFinalizationResult> {
  const userClient = await createClient();
  const { data: session, error: sessionError } = await userClient
    .from("client_file_upload_sessions")
    .select(
      "id, client_id, requester_profile_id, file_kind, original_filename, file_extension, claimed_mime_type, declared_byte_size, temp_object_path, status, expires_at",
    )
    .eq("id", input.sessionId)
    .eq("requester_profile_id", input.requesterProfileId)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session || session.status !== "pending") {
    throw new Error("Upload session is unavailable for finalization");
  }

  const admin = createAdminClient();

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    const { error: expireError } = await admin
      .from("client_file_upload_sessions")
      .update({ status: "expired" })
      .eq("id", session.id)
      .eq("status", "pending");

    if (expireError) {
      throw expireError;
    }

    await removeObjectBestEffort(session.temp_object_path);
    return { reason: "expired", status: "rejected" };
  }

  const { data: claimedSession, error: claimError } = await admin
    .from("client_file_upload_sessions")
    .update({ status: "validating" })
    .eq("id", session.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  if (!claimedSession) {
    throw new Error("Upload session is unavailable for finalization");
  }

  const { data: blob, error: downloadError } = await admin.storage
    .from(PRIVATE_FILE_BUCKET)
    .download(session.temp_object_path);

  if (downloadError || !blob) {
    await rejectUploadSession({
      sessionId: session.id,
      tempObjectPath: session.temp_object_path,
    });
    throw downloadError ?? new Error("Temporary upload object is unavailable");
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const detectedMimeType = detectPrivateFileMimeType(bytes);

  if (!detectedMimeType) {
    await rejectUploadSession({
      sessionId: session.id,
      tempObjectPath: session.temp_object_path,
    });
    return { reason: "invalid_content", status: "rejected" };
  }

  const validation = validatePrivateFile({
    byteSize: bytes.byteLength,
    detectedMimeType,
    extension: session.file_extension,
    fileKind: session.file_kind,
  });

  if (!validation.ok) {
    await rejectUploadSession({
      sessionId: session.id,
      tempObjectPath: session.temp_object_path,
    });
    return { reason: "invalid_content", status: "rejected" };
  }

  const fileId = randomUUID();
  const finalObjectPath = buildPrivateFileObjectPath({
    clientId: session.client_id,
    extension: validation.normalizedExtension,
    fileId,
    fileKind: session.file_kind,
  });

  const { error: moveError } = await admin.storage
    .from(PRIVATE_FILE_BUCKET)
    .move(session.temp_object_path, finalObjectPath);

  if (moveError) {
    await rejectUploadSession({
      sessionId: session.id,
      tempObjectPath: session.temp_object_path,
    });
    throw moveError;
  }

  const visibleAt = input.clientVisibleOnAccept ? new Date().toISOString() : null;
  const { error: insertError } = await admin.from("client_files").insert({
    bucket_id: PRIVATE_FILE_BUCKET,
    byte_size: bytes.byteLength,
    client_id: session.client_id,
    client_visibility_set_by_profile_id: input.clientVisibleOnAccept
      ? input.requesterProfileId
      : null,
    client_visible_at: visibleAt,
    file_kind: session.file_kind,
    id: fileId,
    mime_type: validation.normalizedMimeType,
    object_path: finalObjectPath,
    original_filename: session.original_filename,
    uploaded_by_profile_id: input.requesterProfileId,
  });

  if (insertError) {
    const { error: rollbackMoveError } = await admin.storage
      .from(PRIVATE_FILE_BUCKET)
      .move(finalObjectPath, session.temp_object_path);

    if (rollbackMoveError) {
      await removeObjectBestEffort(finalObjectPath);
      await admin
        .from("client_file_upload_sessions")
        .update({ status: "rejected" })
        .eq("id", session.id)
        .eq("status", "validating");
    } else {
      await rejectUploadSession({
        sessionId: session.id,
        tempObjectPath: session.temp_object_path,
      });
    }

    throw insertError;
  }

  const { data: acceptedSession, error: acceptError } = await admin
    .from("client_file_upload_sessions")
    .update({ status: "accepted" })
    .eq("id", session.id)
    .eq("status", "validating")
    .select("id")
    .maybeSingle();

  if (acceptError || !acceptedSession) {
    await admin.from("client_files").delete().eq("id", fileId);

    const { error: rollbackMoveError } = await admin.storage
      .from(PRIVATE_FILE_BUCKET)
      .move(finalObjectPath, session.temp_object_path);

    if (rollbackMoveError) {
      await removeObjectBestEffort(finalObjectPath);
      await admin
        .from("client_file_upload_sessions")
        .update({ status: "rejected" })
        .eq("id", session.id)
        .eq("status", "validating");
    } else {
      await rejectUploadSession({
        sessionId: session.id,
        tempObjectPath: session.temp_object_path,
      });
    }

    throw acceptError ?? new Error("Upload session acceptance failed");
  }

  return { fileId, status: "accepted" };
}
