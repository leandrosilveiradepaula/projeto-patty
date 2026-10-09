"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import { getCurrentClient } from "@/lib/supabase/data-access";
import { finalizeClientFileUploadSession } from "@/lib/files/private-file-finalization";
import { createClient } from "@/lib/supabase/server";
import {
  type PrivateFileKind,
  validatePrivateFile,
} from "@/lib/validation/private-files";
import { isUuid } from "@/lib/validation/uuid";

export type CreateClientFileUploadSessionInput = {
  byteSize: number;
  claimedMimeType: string;
  extension: string;
  fileKind: PrivateFileKind;
  originalFilename: string;
};

export async function createClientFileUploadSessionAction(
  input: CreateClientFileUploadSessionInput,
) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    throw new Error("Client profile is unavailable");
  }

  const validation = validatePrivateFile({
    byteSize: input.byteSize,
    detectedMimeType: input.claimedMimeType,
    extension: input.extension,
    fileKind: input.fileKind,
  });

  if (!validation.ok) {
    return {
      error: validation.error,
      ok: false as const,
    };
  }

  if (typeof input.originalFilename !== "string") {
    return { error: "invalid_original_filename" as const, ok: false as const };
  }
  const originalFilename = input.originalFilename.trim();

  if (!originalFilename || originalFilename.length > 255) {
    return {
      error: "invalid_original_filename" as const,
      ok: false as const,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_file_upload_sessions")
    .insert({
      claimed_mime_type: validation.normalizedMimeType,
      client_id: client.id,
      declared_byte_size: input.byteSize,
      file_extension: validation.normalizedExtension,
      file_kind: input.fileKind,
      original_filename: originalFilename,
      requester_profile_id: auth.profileId,
    })
    .select("id, temp_object_path, expires_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data.temp_object_path) {
    throw new Error("Upload session did not generate a temporary object path");
  }

  return {
    ok: true as const,
    session: {
      expiresAt: data.expires_at,
      id: data.id,
      objectPath: data.temp_object_path,
    },
  };
}

export async function finalizeClientFileUploadSessionAction(sessionId: string) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    throw new Error("Client profile is unavailable");
  }

  if (!isUuid(sessionId)) {
    return {
      error: "invalid_session_id" as const,
      ok: false as const,
    };
  }

  const result = await finalizeClientFileUploadSession({
    clientVisibleOnAccept: true,
    expectedClientId: client.id,
    requesterProfileId: auth.profileId,
    sessionId,
  });

  if (result.status === "accepted") {
    revalidatePath("/cliente");
    revalidatePath("/cliente/arquivos");
    revalidatePath("/admin");
    revalidatePath("/admin/pendencias");
    revalidatePath("/admin/arquivos");
    revalidatePath(`/admin/clientes/${client.id}`);
    revalidatePath(`/admin/clientes/${client.id}/arquivos`);
  }

  return {
    ok: true as const,
    result,
  };
}
