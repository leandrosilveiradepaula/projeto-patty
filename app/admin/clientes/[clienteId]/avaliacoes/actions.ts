"use server";

import { redirect } from "next/navigation";

import {
  isAssessmentKind,
  parseAssessmentDate,
} from "@/lib/evaluations/assessment-draft";
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
  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
    };
  }

  const kindValue = formData.get("assessmentKind");
  const assessedAt = parseAssessmentDate(formData.get("assessedAt"));

  if (typeof kindValue !== "string" || !isAssessmentKind(kindValue)) {
    return {
      message: "Selecione se a avaliação é quinzenal ou mensal.",
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
      assessmentKind: kindValue,
      clientId: client.id,
      createdByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível criar o rascunho da avaliação. Confirme seu acesso e MFA e tente novamente.",
    };
  }

  redirect(`/admin/avaliacoes/${assessment.id}`);
}
