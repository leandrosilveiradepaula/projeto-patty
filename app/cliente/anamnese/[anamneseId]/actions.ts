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

function getDraftPersistenceErrorMessage(error: unknown) {
  if (error instanceof AnamnesisDraftPersistenceError) {
    if (
      error.code === "draft_not_found" ||
      error.code === "client_not_found"
    ) {
      return "Este rascunho não está mais disponível para edição. Atualize a página.";
    }

    if (
      error.code === "question_not_available" ||
      error.code === "unsupported_answer_type"
    ) {
      return "Esta pergunta não está disponível para edição nesta interface.";
    }

    if (error.code === "invalid_answer_value") {
      return "A resposta enviada não corresponde às opções disponíveis desta pergunta.";
    }
  }

  return "Não foi possível salvar a resposta. Tente novamente.";
}

function revalidateAnamnesisDraft(submissionId: string) {
  revalidatePath(`/cliente/anamnese/${submissionId}`);
  revalidatePath("/cliente/anamnese");
}

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
    return {
      message: getDraftPersistenceErrorMessage(error),
      success: false,
    };
  }

  revalidateAnamnesisDraft(submissionId);

  return {
    message: "Resposta salva no rascunho.",
    success: true,
  };
}

export async function saveClientAnamnesisDraftSingleChoiceAnswer(
  submissionId: string,
  questionId: string,
  _state: ClientAnamnesisDraftAnswerFormState,
  formData: FormData,
): Promise<ClientAnamnesisDraftAnswerFormState> {
  await requireRole("client");

  const value = formData.get("answerValue");

  if (typeof value !== "string") {
    return {
      message: "Selecione uma das opções disponíveis antes de salvar.",
      success: false,
    };
  }

  try {
    await saveCurrentClientAnamnesisDraftAnswer({
      answerValue: value,
      expectedAnswerType: "single_choice",
      questionId,
      submissionId,
    });
  } catch (error) {
    return {
      message: getDraftPersistenceErrorMessage(error),
      success: false,
    };
  }

  revalidateAnamnesisDraft(submissionId);

  return {
    message: "Resposta salva no rascunho.",
    success: true,
  };
}
