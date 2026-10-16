import { getWeeklyFeedbackFieldError, type WeeklyFeedbackQuestion } from "./definition.ts";

export type WeeklyFeedbackQuestionCompletion =
  "answered" | "required-missing" | "optional-empty" | "invalid";

/**
 * Only form-completion hints. Never a clinical score or assessment of
 * adherence. The original response remains in the controlled form until
 * the client explicitly saves/submits through the existing server action.
 */
export function weeklyFeedbackQuestionCompletion(
  question: WeeklyFeedbackQuestion,
  answer: string,
): WeeklyFeedbackQuestionCompletion {
  if (!answer.trim()) {
    return question.required ? "required-missing" : "optional-empty";
  }
  return getWeeklyFeedbackFieldError(question, answer, false) ? "invalid" : "answered";
}

export function weeklyFeedbackQuestionNavigationLabel(
  question: WeeklyFeedbackQuestion,
  index: number,
  answer: string,
): string {
  const labels: Record<WeeklyFeedbackQuestionCompletion, string> = {
    "answered": "Preenchida",
    "required-missing": "Obrigatória pendente",
    "optional-empty": "Opcional sem resposta",
    "invalid": "Corrigir resposta",
  };
  // The option contains only the form definition and a factual completion
  // hint. Never interpolate response content, including health answers.
  const cleanLabel = question.label.replace(/\s+/g, " ").trim();
  const clipped = cleanLabel.length > 78 ? cleanLabel.slice(0, 77).trimEnd() + "…" : cleanLabel;
  return "Pergunta " + (index + 1) + " · " +
    labels[weeklyFeedbackQuestionCompletion(question, answer)] + " · " + clipped;
}
