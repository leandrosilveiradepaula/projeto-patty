"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  AnamnesisDraftPersistenceError,
  saveCurrentClientAnamnesisDraftAnswer,
} from "@/lib/anamnesis/draft";
import {
  AnamnesisSubmissionError,
  submitCurrentClientAnamnesisDraft,
} from "@/lib/anamnesis/submission";
import { isAnamnesisConsentAccepted } from "@/lib/anamnesis/consent-policy";

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


export type ClientAnamnesisSubmitFormState = {
  message: string | null;
  success: boolean;
};

export async function submitClientAnamnesis(
  submissionId: string,
  _state: ClientAnamnesisSubmitFormState,
  formData: FormData,
): Promise<ClientAnamnesisSubmitFormState> {
  await requireRole("client");

  if (!isAnamnesisConsentAccepted(formData.get("consentAccepted"))) {
    return {
      message:
        "Marque a concordância com o tratamento das informações desta Anamnese antes de enviar.",
      success: false,
    };
  }

  try {
    await submitCurrentClientAnamnesisDraft(submissionId, {
      consentAccepted: true,
    });
  } catch (error) {
    if (error instanceof AnamnesisSubmissionError) {
      if (error.code === "incomplete_or_invalid_answers") {
        return {
          message:
            "Preencha todas as perguntas obrigatórias que se aplicam a você antes de enviar.",
          success: false,
        };
      }

      if (
        error.code === "draft_not_found" ||
        error.code === "client_not_found" ||
        error.code === "invalid_identifier"
      ) {
        return {
          message:
            "Este rascunho não está mais disponível para envio. Atualize a página.",
          success: false,
        };
      }
    }

    return {
      message: "Não foi possível enviar a Anamnese. Tente novamente.",
      success: false,
    };
  }

  revalidateAnamnesisDraft(submissionId);

  return {
    message: "Sua Anamnese foi enviada para análise da Patty.",
    success: true,
  };
}
