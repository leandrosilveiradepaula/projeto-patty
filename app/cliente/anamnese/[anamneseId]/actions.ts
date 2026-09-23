"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  AnamnesisDraftPersistenceError,
  saveCurrentClientAnamnesisDraftAnswer,
} from "@/lib/anamnesis/draft";

export type ClientAnamnesisDraftAnswerFormState = {
  message: string | null;
  success: boolean;
};

export async function saveClientAnamnesisDraftTextAnswer(
  submissionId: string,
  questionId: string,
  _state: ClientAnamnesisDraftAnswerFormState,
  formData: FormData,
): Promise<ClientAnamnesisDraftAnswerFormState> {
  await requireRole("client");

  const value = formData.get("answerValue");

  if (typeof value !== "string") {
    return {
      message: "Não foi possível ler esta resposta.",
      success: false,
    };
  }

  try {
    await saveCurrentClientAnamnesisDraftAnswer({
      answerValue: value,
      expectedAnswerType: "text",
      questionId,
      submissionId,
    });
  } catch (error) {
    if (error instanceof AnamnesisDraftPersistenceError) {
      if (
        error.code === "draft_not_found" ||
        error.code === "client_not_found"
      ) {
        return {
          message:
            "Este rascunho não está mais disponível para edição. Atualize a página.",
          success: false,
        };
      }

      if (
        error.code === "question_not_available" ||
        error.code === "unsupported_answer_type"
      ) {
        return {
          message:
            "Esta pergunta não está disponível para edição nesta interface.",
          success: false,
        };
      }
    }

    return {
      message: "Não foi possível salvar a resposta. Tente novamente.",
      success: false,
    };
  }

  revalidatePath(`/cliente/anamnese/${submissionId}`);
  revalidatePath("/cliente/anamnese");

  return {
    message: "Resposta salva no rascunho.",
    success: true,
  };
}
