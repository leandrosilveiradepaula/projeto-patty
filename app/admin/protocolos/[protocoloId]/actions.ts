"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleProtocolPublication,
  createAccessibleProtocolVersionApproval,
  getAccessibleProtocolVersion,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  submitAccessibleProtocolVersionForReview,
} from "@/lib/supabase/data-access";

export type ProtocolLifecycleOperation = "approve" | "publish" | "submit";

export type ProtocolLifecycleState = {
  message: string | null;
  success: boolean;
};

export async function runProtocolLifecycleAction(
  protocolId: string,
  protocolVersionId: string,
  operation: ProtocolLifecycleOperation,
  _state: ProtocolLifecycleState,
  formData: FormData,
): Promise<ProtocolLifecycleState> {
  const context = await requireRole("admin");
  const version = await getAccessibleProtocolVersion(
    protocolId,
    protocolVersionId,
  );

  if (!version) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  try {
    if (operation === "submit") {
      if (version.submitted_for_review_at) {
        return {
          message: "Esta versão já foi submetida para revisão.",
          success: false,
        };
      }

      if (version.created_by_profile_id !== context.profileId) {
        return {
          message:
            "A regra de acesso atual permite submeter apenas a versão criada pelo próprio perfil administrativo.",
          success: false,
        };
      }

      const submitted = await submitAccessibleProtocolVersionForReview(
        protocolId,
        version.id,
      );

      if (!submitted) {
        return {
          message: "A versão não pôde ser submetida ou já mudou de estado.",
          success: false,
        };
      }
    }

    if (operation === "approve") {
      if (!version.submitted_for_review_at) {
        return {
          message: "A versão precisa ser submetida para revisão antes da aprovação.",
          success: false,
        };
      }

      const approvals = await listAccessibleProtocolVersionApprovals([
        version.id,
      ]);

      if (approvals.length > 0) {
        return {
          message: "Esta versão já possui uma aprovação registrada.",
          success: false,
        };
      }

      await createAccessibleProtocolVersionApproval({
        approvedByProfileId: context.profileId,
        clientId: version.client_id,
        protocolVersionId: version.id,
      });
    }

    if (operation === "publish") {
      if (formData.get("confirmPublication") !== "yes") {
        return {
          message: "Confirme explicitamente a publicação para a cliente.",
          success: false,
        };
      }

      const [approvals, publications] = await Promise.all([
        listAccessibleProtocolVersionApprovals([version.id]),
        listAccessibleProtocolPublications([version.id]),
      ]);

      if (publications.length > 0) {
        return {
          message: "Esta versão já está publicada.",
          success: false,
        };
      }

      const approval = approvals[0];

      if (!approval) {
        return {
          message: "A versão precisa estar aprovada antes da publicação.",
          success: false,
        };
      }

      await createAccessibleProtocolPublication({
        approvalId: approval.id,
        clientId: version.client_id,
        protocolVersionId: version.id,
        publishedByProfileId: context.profileId,
      });
    }
  } catch {
    return {
      message:
        "Não foi possível concluir a ação. O estado da versão ou sua autorização pode ter mudado.",
      success: false,
    };
  }

  revalidatePath(`/admin/protocolos/${protocolId}`);
  revalidatePath("/cliente/protocolo");

  const successMessages: Record<ProtocolLifecycleOperation, string> = {
    approve: "Aprovação humana registrada.",
    publish: "Versão publicada para a cliente.",
    submit: "Versão submetida para revisão e congelada para alterações.",
  };

  return {
    message: successMessages[operation],
    success: true,
  };
}
