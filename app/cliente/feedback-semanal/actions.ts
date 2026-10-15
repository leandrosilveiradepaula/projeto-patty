"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildWeeklyFeedbackAnswers,
  WeeklyFeedbackFieldValidationError,
  parseWeeklyFeedbackDefinition,
  validateWeeklyFeedbackAnswers,
} from "@/lib/weekly-feedback/definition";
import { fingerprintWeeklyFeedbackAnswers, validWeeklyFeedbackFingerprint } from "@/lib/weekly-feedback/draft-fingerprint";
import { requireRole } from "@/lib/supabase/auth";
import {
  getCurrentClient,
  getCurrentClientWeeklyFeedback,
  updateCurrentClientWeeklyFeedback,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";
import { readSingleStringFormValue } from "@/lib/validation/form-fields";

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
  questionKey?: string | null;
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

  const intent = readSingleStringFormValue(formData, "intent");
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

  const expectedFingerprint = readSingleStringFormValue(formData, "expectedFingerprint");
  if (!validWeeklyFeedbackFingerprint(expectedFingerprint)) {
    return { outcome: "invalid", message: "Atualize a página para confirmar a versão do rascunho antes de salvar." };
  }
  if (fingerprintWeeklyFeedbackAnswers(feedback.answers) !== expectedFingerprint) {
    return { outcome: "conflict", message: "As respostas foram alteradas em outra sessão desde a abertura deste formulário. Seu texto permanece na tela; atualize a página e confira as respostas salvas antes de decidir o que reenviar." };
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
  } catch (error) {
    return {
      questionKey: error instanceof WeeklyFeedbackFieldValidationError ? error.questionKey : null,
      outcome: "invalid",
      message: "Revise os campos numéricos, os limites e as perguntas obrigatórias antes de tentar novamente.",
    };
  }

  let saved;
  try {
    saved = await updateCurrentClientWeeklyFeedback({
      expectedAnswers: feedback.answers,
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

  if (submit) {
    // A successful submission removes this form from the revalidated RSC tree.
    // Navigate from the server after the atomic write: a client useEffect on
    // an unmounted form cannot reliably display the receipt. This is reached
    // only after the authenticated, CAS-protected mutation returned a row.
    // The destination rechecks the exact submitted ID through client RLS.
    const id = encodeURIComponent(feedbackId);
    redirect("/cliente/feedback-semanal?registro=" + id + "#feedback-enviado-" + id);
  }

  return {
    outcome: "draft-saved",
    message: "Rascunho salvo. Você pode continuar e enviar em outro momento.",
  };
}
