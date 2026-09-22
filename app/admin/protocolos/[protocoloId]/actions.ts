"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleProtocolPublication,
  createAccessibleProtocolVersionApproval,
  getAccessibleProtocol,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersions,
  submitAccessibleProtocolVersionForReview,
} from "@/lib/supabase/data-access";

export type ProtocolLifecycleFormState = {
  message: string | null;
  success: boolean;
};

async function getAccessibleVersion(protocolId: string, protocolVersionId: string) {
  const protocol = await getAccessibleProtocol(protocolId);

  if (!protocol) {
    return null;
  }

  const versions = await listAccessibleProtocolVersions(protocol.id);
  const version = versions.find((item) => item.id === protocolVersionId);

  if (!version) {
    return null;
  }

  return { protocol, version };
}

function revalidateProtocolPaths(protocolId: string, clientId: string) {
  revalidatePath(`/admin/protocolos/${protocolId}`);
  revalidatePath(`/admin/clientes/${clientId}/protocolos`);
  revalidatePath("/admin/protocolos");
  revalidatePath("/cliente/protocolo");
}

export async function submitProtocolVersionForReview(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");

  const accessible = await getAccessibleVersion(protocolId, protocolVersionId);

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.version.submitted_for_review_at) {
    return {
      message: "Esta versão já foi submetida para revisão.",
      success: false,
    };
  }

  try {
    const updated = await submitAccessibleProtocolVersionForReview(
      accessible.version.id,
    );

    if (!updated) {
      return {
        message:
          "A versão não pôde ser submetida. Ela pode ter sido alterada por outra ação.",
        success: false,
      };
    }
  } catch {
    return {
      message:
        "Não foi possível submeter esta versão. Confirme seu acesso atual e tente novamente.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message: "Versão submetida para revisão e congelada para edição.",
    success: true,
  };
}

export async function approveProtocolVersion(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  const context = await requireRole("admin");

  const accessible = await getAccessibleVersion(protocolId, protocolVersionId);

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (!accessible.version.submitted_for_review_at) {
    return {
      message: "A versão precisa ser submetida para revisão antes da aprovação.",
      success: false,
    };
  }

  const approvals = await listAccessibleProtocolVersionApprovals([
    accessible.version.id,
  ]);

  if (approvals.length > 0) {
    return {
      message: "Esta versão já possui aprovação registrada.",
      success: false,
    };
  }

  try {
    await createAccessibleProtocolVersionApproval({
      approvedByProfileId: context.profileId,
      clientId: accessible.protocol.client_id,
      protocolVersionId: accessible.version.id,
    });
  } catch {
    return {
      message:
        "Não foi possível aprovar esta versão. Ela pode já ter sido aprovada ou seu acesso atual pode ter mudado.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message: "Aprovação humana registrada para esta versão.",
    success: true,
  };
}

export async function publishProtocolVersion(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  const context = await requireRole("admin");

  const accessible = await getAccessibleVersion(protocolId, protocolVersionId);

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const [approvals, publications] = await Promise.all([
    listAccessibleProtocolVersionApprovals([accessible.version.id]),
    listAccessibleProtocolPublications([accessible.version.id]),
  ]);

  const approval = approvals[0] ?? null;

  if (!approval) {
    return {
      message: "A versão precisa de aprovação registrada antes da publicação.",
      success: false,
    };
  }

  if (publications.length > 0) {
    return {
      message: "Esta versão já foi publicada.",
      success: false,
    };
  }

  try {
    await createAccessibleProtocolPublication({
      approvalId: approval.id,
      clientId: accessible.protocol.client_id,
      protocolVersionId: accessible.version.id,
      publishedByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível publicar esta versão. Ela pode já ter sido publicada ou seu acesso atual pode ter mudado.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message: "Versão publicada para a cliente.",
    success: true,
  };
}
