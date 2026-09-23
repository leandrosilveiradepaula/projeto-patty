"use server";

import { revalidatePath } from "next/cache";

import { parseCorrectionJson } from "@/lib/anamnesis/corrections";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleAnamnesisAnswerCorrection,
  getAccessibleAnamnesisAnswer,
  getAccessibleAnamnesisSubmission,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export type AnamnesisCorrectionFormState = {
  message: string | null;
  success: boolean;
};

export async function addAnamnesisAnswerCorrection(
  submissionId: string,
  answerId: string,
  _state: AnamnesisCorrectionFormState,
  formData: FormData,
): Promise<AnamnesisCorrectionFormState> {
  const context = await requireRole("admin");

  if (!isUuid(submissionId) || !isUuid(answerId)) {
    return {
      message: "Identificador de Anamnese ou resposta inválido.",
      success: false,
    };
  }

  const [submission, answer] = await Promise.all([
    getAccessibleAnamnesisSubmission(submissionId),
    getAccessibleAnamnesisAnswer(answerId),
  ]);

  if (!submission || !answer || answer.submission_id !== submission.id) {
    return {
      message: "A resposta não está acessível nesta Anamnese.",
      success: false,
    };
  }

  if (!submission.submitted_at) {
    return {
      message: "Correções só podem ser registradas após o envio da Anamnese.",
      success: false,
    };
  }

  const rawValue = formData.get("correctedAnswerValue");

  if (typeof rawValue !== "string") {
    return {
      message: "Informe o valor corrigido.",
      success: false,
    };
  }

  const parsed = parseCorrectionJson(rawValue);

  if (!parsed.ok) {
    return {
      message: parsed.message,
      success: false,
    };
  }

  try {
    await createAccessibleAnamnesisAnswerCorrection({
      answerId: answer.id,
      correctedAnswerValue: parsed.value,
      correctedByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível registrar a correção. Confirme sua atribuição atual e tente novamente.",
      success: false,
    };
  }

  revalidatePath(`/admin/anamneses/${submission.id}`);
  revalidatePath(`/admin/anamneses/${submission.id}/correcoes`);

  return {
    message: "Correção adicionada ao histórico sem alterar a resposta original.",
    success: true,
  };
}
