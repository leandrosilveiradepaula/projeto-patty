"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { loadSupportedAssessmentKindOptions } from "@/lib/evaluations/assessment-configuration-loader";
import { parseAssessmentDate } from "@/lib/evaluations/assessment-draft";
import { isUuid } from "@/lib/validation/uuid";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientAssessment,
  getAccessibleClient,
} from "@/lib/supabase/data-access";

export type CreateAssessmentState = {
  message: string | null;
};

export async function createAssessmentAction(
  clientId: string,
  _state: CreateAssessmentState,
  formData: FormData,
): Promise<CreateAssessmentState> {
  const context = await requireRole("admin");
  if (!isUuid(clientId)) {
    return { message: "Identificador de cliente inválido." };
  }
  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
    };
  }

  const kindValue = formData.get("assessmentKind");
  const assessedAt = parseAssessmentDate(formData.get("assessedAt"));
  const assessmentKinds = await loadSupportedAssessmentKindOptions();
  const selectedKind =
    typeof kindValue === "string"
      ? assessmentKinds.options.find(
          (option) => option.historicalCode === kindValue,
        ) ?? null
      : null;

  if (!selectedKind) {
    return {
      message: "Selecione um tipo de avaliação disponível.",
    };
  }

  if (!assessedAt) {
    return {
      message: "Informe uma data de avaliação válida.",
    };
  }

  let assessment;

  try {
    assessment = await createAccessibleClientAssessment({
      assessedAt,
      assessmentKind: selectedKind.historicalCode,
      clientId: client.id,
      createdByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível criar o rascunho da avaliação. Confirme seu acesso e MFA e tente novamente.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/avaliacoes");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(`/admin/clientes/${client.id}/avaliacoes`);
  redirect(`/admin/avaliacoes/${assessment.id}`);
}
