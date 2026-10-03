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

export async function saveWeeklyFeedbackAction(
  feedbackId: string,
  formData: FormData,
) {
  await requireRole("client");
  const client = await getCurrentClient();

  if (!client || !isUuid(feedbackId)) {
    throw new Error("Feedback indisponível");
  }

  const feedback = await getCurrentClientWeeklyFeedback(client.id, feedbackId);

  if (!feedback || feedback.submitted_at) {
    throw new Error("Feedback indisponível para edição");
  }

  const version = feedback.weekly_feedback_form_versions;
  const definition = version
    ? parseWeeklyFeedbackDefinition(version.definition)
    : null;

  if (!definition) {
    throw new Error("Definição do Feedback Semanal indisponível");
  }

  const answers = buildWeeklyFeedbackAnswers(formData, definition);
  const intent = formData.get("intent");
  const submit = intent === "submit";

  if (submit) {
    validateWeeklyFeedbackAnswers(answers, definition);
  }

  await updateCurrentClientWeeklyFeedback({
    answers,
    clientId: client.id,
    feedbackId,
    submit,
  });

  revalidatePath("/cliente");
  revalidatePath("/cliente/feedback-semanal");
}
