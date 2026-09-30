"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import { buildProtocolCloneSnapshot } from "@/lib/protocol/clone-snapshot";
import { getProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
import {
  cloneAccessibleProtocolVersionDraft,
  createAccessibleProtocolPublication,
  createAccessibleProtocolVersionApproval,
  getAccessibleProtocol,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersionMealPlans,
  listAccessibleProtocolVersions,
  submitAccessibleProtocolVersionForReview,
} from "@/lib/supabase/data-access";

export type ProtocolLifecycleFormState = {
  message: string | null;
  success: boolean;
};

async function getAccessibleVersionLifecycle(
  protocolId: string,
  protocolVersionId: string,
) {
  const protocol = await getAccessibleProtocol(protocolId);

  if (!protocol) {
    return null;
  }

  const versions = await listAccessibleProtocolVersions(protocol.id);
  const version = versions.find((item) => item.id === protocolVersionId);

  if (!version) {
    return null;
  }

  const [approvals, publications] = await Promise.all([
    listAccessibleProtocolVersionApprovals([version.id]),
    listAccessibleProtocolPublications([version.id]),
  ]);
  const approval = approvals[0] ?? null;
  const publication = publications[0] ?? null;
  const lifecycleAction = getProtocolLifecycleAction({
    hasApproval: Boolean(approval),
    hasPublication: Boolean(publication),
    submittedForReview: Boolean(version.submitted_for_review_at),
  });

  return {
    approval,
    lifecycleAction,
    protocol,
    publication,
    version,
  };
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

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    protocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.lifecycleAction !== "submit") {
    return {
      message:
        "Esta versão não está mais no estado de rascunho disponível para submissão.",
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
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  const context = await requireRole("admin");

  if (formData.get("confirmPublication") !== "yes") {
    return {
      message: "Confirme explicitamente a publicação desta versão.",
      success: false,
    };
  }

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    protocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.lifecycleAction !== "approve") {
    return {
      message:
        "Esta versão não está no estado permitido para registrar aprovação.",
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

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    protocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.lifecycleAction !== "publish" || !accessible.approval) {
    return {
      message:
        "Esta versão não está no estado permitido para publicação.",
      success: false,
    };
  }

  try {
    await createAccessibleProtocolPublication({
      approvalId: accessible.approval.id,
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

export async function cloneProtocolVersionDraft(
  protocolId: string,
  sourceProtocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    sourceProtocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (!accessible.version.submitted_for_review_at) {
    return {
      message:
        "Somente versões já submetidas e congeladas podem servir como base para um novo rascunho.",
      success: false,
    };
  }

  try {
    const sourcePlans = await listAccessibleProtocolVersionMealPlans([
      accessible.version.id,
    ]);
    const sourcePlan = sourcePlans[0] ?? null;
    const snapshot = buildProtocolCloneSnapshot(sourcePlan);

    const newVersionId = await cloneAccessibleProtocolVersionDraft(
      accessible.version.id,
      snapshot,
    );

    if (!newVersionId) {
      return {
        message: "A nova versão não foi criada.",
        success: false,
      };
    }
  } catch {
    return {
      message:
        "Não foi possível criar o novo rascunho. Confirme seu acesso, MFA e tente novamente.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message:
      "Novo rascunho criado a partir desta versão, preservando a estrutura persistida.",
    success: true,
  };
}

