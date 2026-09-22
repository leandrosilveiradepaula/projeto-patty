"use server";

import { revalidatePath } from "next/cache";

import { isProfessionalDecision } from "@/lib/follow-up/professional-decisions";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleProfessionalFollowUp,
  getAccessibleClientAssessment,
} from "@/lib/supabase/data-access";

export type ProfessionalFollowUpFormState = {
  message: string | null;
  success: boolean;
};

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export async function addProfessionalFollowUp(
  assessmentId: string,
  _state: ProfessionalFollowUpFormState,
  formData: FormData,
): Promise<ProfessionalFollowUpFormState> {
  const context = await requireRole("admin");
  const assessment = await getAccessibleClientAssessment(assessmentId);

  if (!assessment) {
    return {
      message: "Esta avaliação não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const decisionValue = formData.get("professionalDecision");
  const reasonValue = formData.get("decisionReason");

  if (
    typeof decisionValue !== "string" ||
    !isProfessionalDecision(decisionValue)
  ) {
    return {
      message: "Selecione uma decisão profissional válida.",
      success: false,
    };
  }

  if (typeof reasonValue !== "string" || !reasonValue.trim()) {
    return {
      message: "Registre o motivo da decisão profissional.",
      success: false,
    };
  }

  try {
    await createAccessibleProfessionalFollowUp({
      adherencePerception: optionalText(formData.get("adherencePerception")),
      assessmentId: assessment.id,
      authorProfileId: context.profileId,
      clientId: assessment.client_id,
      decisionReason: reasonValue.trim(),
      difficulty: optionalText(formData.get("difficulty")),
      pattyObservation: optionalText(formData.get("pattyObservation")),
      professionalDecision: decisionValue,
    });
  } catch {
    return {
      message:
        "Não foi possível registrar o acompanhamento. Confirme seu acesso atual e tente novamente.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);

  return {
    message: "Acompanhamento profissional registrado.",
    success: true,
  };
}
