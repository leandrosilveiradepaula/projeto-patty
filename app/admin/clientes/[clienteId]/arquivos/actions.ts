"use server";

import { revalidatePath } from "next/cache";

import {
  createAdminPrivateFileUploadSession,
  releasePrivateFileToClient,
} from "@/lib/files/private-file-admin";
import { finalizeClientFileUploadSession } from "@/lib/files/private-file-finalization";
import { requireRole } from "@/lib/supabase/auth";
import {
  type PrivateFileKind,
  validatePrivateFile,
} from "@/lib/validation/private-files";
import { isUuid } from "@/lib/validation/uuid";

export type AdminPrivateFileUploadSessionInput = {
  byteSize: number;
  claimedMimeType: string;
  extension: string;
  fileKind: PrivateFileKind;
  originalFilename: string;
};

export async function createAdminPrivateFileUploadSessionAction(
  clientId: string,
  input: AdminPrivateFileUploadSessionInput,
) {
  const auth = await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      error: "invalid_client_id" as const,
      ok: false as const,
    };
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

  const originalFilename = input.originalFilename.trim();

  if (!originalFilename) {
    return {
      error: "invalid_original_filename" as const,
      ok: false as const,
    };
  }

  const session = await createAdminPrivateFileUploadSession({
    actorProfileId: auth.profileId,
    byteSize: input.byteSize,
    claimedMimeType: validation.normalizedMimeType,
    clientId,
    extension: validation.normalizedExtension,
    fileKind: input.fileKind,
    originalFilename,
  });

  if (!session) {
    return {
      error: "client_not_found" as const,
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    session,
  };
}

export async function finalizeAdminPrivateFileUploadSessionAction(
  clientId: string,
  sessionId: string,
) {
  const auth = await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      error: "invalid_client_id" as const,
      ok: false as const,
    };
  }

  if (!isUuid(sessionId)) {
    return {
      error: "invalid_session_id" as const,
      ok: false as const,
    };
  }

  const result = await finalizeClientFileUploadSession({
    clientVisibleOnAccept: false,
    requesterProfileId: auth.profileId,
    sessionId,
  });

  if (result.status === "accepted") {
    revalidatePath("/admin/arquivos");
    revalidatePath(`/admin/clientes/${clientId}/arquivos`);
  }

  return {
    ok: true as const,
    result,
  };
}

export type AdminPrivateFileReleaseState = {
  message: string | null;
  success: boolean;
};

export async function releaseAdminPrivateFileToClientAction(
  clientId: string,
  fileId: string,
  _state: AdminPrivateFileReleaseState,
  formData: FormData,
): Promise<AdminPrivateFileReleaseState> {
  const auth = await requireRole("admin");

  if (formData.get("confirmRelease") !== "yes") {
    return {
      message: "Confirme explicitamente a liberação deste arquivo.",
      success: false,
    };
  }

  if (!isUuid(clientId) || !isUuid(fileId)) {
    return {
      message: "O arquivo ou a cliente informada é inválido.",
      success: false,
    };
  }

  try {
    const result = await releasePrivateFileToClient({
      actorProfileId: auth.profileId,
      clientId,
      fileId,
    });

    if (result.status === "not_found") {
      return {
        message: "Este arquivo não está disponível para esta cliente.",
        success: false,
      };
    }

    revalidatePath("/admin/arquivos");
    revalidatePath(`/admin/clientes/${clientId}/arquivos`);
    revalidatePath("/cliente");
    revalidatePath("/cliente/arquivos");

    return {
      message:
        result.status === "released"
          ? "Arquivo liberado para a cliente."
          : "Este arquivo já está visível para a cliente.",
      success: true,
    };
  } catch {
    return {
      message: "Não foi possível liberar o arquivo para a cliente.",
      success: false,
    };
  }
}
