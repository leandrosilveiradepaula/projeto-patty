"use server";

import { revalidatePath } from "next/cache";

import {
  buildWeeklyFeedbackAnswers,
  parseWeeklyFeedbackDefinition,
  validateWeeklyFeedbackAnswers,
} from "@/lib/weekly-feedback/definition";
import { requireRole } from "@/lib/supabase/auth";
import {
  getCurrentClient,
  getCurrentClientWeeklyFeedback,
  updateCurrentClientWeeklyFeedback,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export type WeeklyFeedbackSaveOutcome =
  | "idle"
  | "draft-saved"
  | "submitted"
  | "invalid"
  | "conflict"
  | "save-error"
  | "unavailable";

export type WeeklyFeedbackSaveFormState = {
  message: string | null;
  outcome: WeeklyFeedbackSaveOutcome;
};

export async function saveWeeklyFeedbackAction(
  feedbackId: string,
  _previousState: WeeklyFeedbackSaveFormState,
  formData: FormData,
): Promise<WeeklyFeedbackSaveFormState> {
  await requireRole("client");
  const client = await getCurrentClient();

  if (!client || !isUuid(feedbackId)) {
    return { outcome: "unavailable", message: "Feedback indisponível. Confira seu acesso." };
  }

  const intent = formData.get("intent");
  if (intent !== "save" && intent !== "submit") {
    return { outcome: "invalid", message: "Escolha salvar o rascunho ou enviar o feedback." };
  }

  const feedback = await getCurrentClientWeeklyFeedback(client.id, feedbackId);
  if (!feedback || feedback.submitted_at) {
    return {
      outcome: "conflict",
      message: "O feedback pode já ter sido enviado em outra aba ou não estar mais disponível. Nenhuma nova gravação foi confirmada.",
    };
  }

  const version = feedback.weekly_feedback_form_versions;
  const definition = version
    ? parseWeeklyFeedbackDefinition(version.definition)
    : null;

  if (!definition) {
    return { outcome: "unavailable", message: "A definição versionada deste feedback está indisponível." };
  }

  const submit = intent === "submit";
  let answers;
  try {
    answers = buildWeeklyFeedbackAnswers(formData, definition);
    if (submit) {
      validateWeeklyFeedbackAnswers(answers, definition);
    }
  } catch {
    return {
      outcome: "invalid",
      message: "Revise os campos numéricos, os limites e as perguntas obrigatórias antes de tentar novamente.",
    };
  }

  let saved;
  try {
    saved = await updateCurrentClientWeeklyFeedback({
      answers,
      clientId: client.id,
      feedbackId,
      submit,
    });
  } catch {
    return {
      outcome: "save-error",
      message: "Não foi possível gravar agora. Suas respostas continuam nesta tela para uma nova tentativa.",
    };
  }

  if (!saved) {
    return {
      outcome: "conflict",
      message: "Este registro mudou antes da gravação. Nenhuma nova gravação foi confirmada; confira a situação antes de tentar novamente.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/clientes/" + client.id);
  revalidatePath("/admin/clientes/" + client.id + "/feedback-semanal");
  revalidatePath("/cliente");
  revalidatePath("/cliente/feedback-semanal");

  return {
    outcome: submit ? "submitted" : "draft-saved",
    message: submit
      ? "Feedback enviado e preservado. A Patty poderá consultar as respostas."
      : "Rascunho salvo. Você pode continuar e enviar em outro momento.",
  };
}
