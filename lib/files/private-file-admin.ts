import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { classifyPrivateFileReleasePostcondition } from "@/lib/files/private-file-release-postcondition";
import type { PrivateFileKind } from "@/lib/validation/private-files";

const PRIVATE_FILE_BUCKET = "client-private";

export async function listClientsForPrivateFileAdministration() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("id, profile_id, full_name, created_at, profiles(display_name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getClientForPrivateFileAdministration(clientId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("id, profile_id, full_name, created_at, profiles(display_name)")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAdminPrivateFileUploadSession(input: {
  actorProfileId: string;
  byteSize: number;
  claimedMimeType: string;
  clientId: string;
  extension: string;
  fileKind: PrivateFileKind;
  originalFilename: string;
}) {
  const admin = createAdminClient();

  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id")
    .eq("id", input.clientId)
    .maybeSingle();

  if (clientError) {
    throw clientError;
  }

  if (!client) {
    return null;
  }

  const { data: session, error: sessionError } = await admin
    .from("client_file_upload_sessions")
    .insert({
      claimed_mime_type: input.claimedMimeType,
      client_id: input.clientId,
      declared_byte_size: input.byteSize,
      file_extension: input.extension,
      file_kind: input.fileKind,
      original_filename: input.originalFilename,
      requester_profile_id: input.actorProfileId,
    })
    .select("id, temp_object_path, expires_at")
    .single();

  if (sessionError) {
    throw sessionError;
  }

  if (!session.temp_object_path) {
    throw new Error("Upload session did not generate a temporary object path");
  }

  const { data: signedUpload, error: signedUploadError } = await admin.storage
    .from(PRIVATE_FILE_BUCKET)
    .createSignedUploadUrl(session.temp_object_path, {
      upsert: false,
    });

  if (signedUploadError || !signedUpload?.token) {
    await admin
      .from("client_file_upload_sessions")
      .update({ status: "rejected" })
      .eq("id", session.id)
      .eq("status", "pending");

    throw signedUploadError ?? new Error("Signed upload token was not created");
  }

  return {
    expiresAt: session.expires_at,
    id: session.id,
    objectPath: session.temp_object_path,
    token: signedUpload.token,
  };
}

export async function releasePrivateFileToClient(input: {
  actorProfileId: string;
  clientId: string;
  fileId: string;
}) {
  const admin = createAdminClient();
  const { data: file, error: fileError } = await admin
    .from("client_files")
    .select("id, client_id, client_visible_at")
    .eq("id", input.fileId)
    .eq("client_id", input.clientId)
    .maybeSingle();

  if (fileError) {
    throw fileError;
  }

  if (!file) {
    return { status: "not_found" as const };
  }

  if (file.client_visible_at) {
    return { status: "already_visible" as const };
  }

  const { data: released, error: releaseError } = await admin
    .from("client_files")
    .update({
      client_visibility_set_by_profile_id: input.actorProfileId,
      client_visible_at: new Date().toISOString(),
    })
    .eq("id", input.fileId)
    .eq("client_id", input.clientId)
    .is("client_visible_at", null)
    .select("id")
    .maybeSingle();

  if (releaseError) {
    throw releaseError;
  }

  if (!released) {
    const { data: persistedFile, error: verifyError } = await admin
      .from("client_files")
      .select("client_visible_at")
      .eq("id", input.fileId)
      .eq("client_id", input.clientId)
      .maybeSingle();

    if (verifyError) {
      throw verifyError;
    }

    return {
      status: classifyPrivateFileReleasePostcondition(persistedFile),
    };
  }

  return { status: "released" as const };
}
