import { formatWeeklyFeedbackPeriodDate } from "../weekly-feedback/date-format.ts";

/**
 * Pure reminder content builder. Rejects invalid or reversed date-only periods
 * without rewriting them, selecting a client's protocol or including answers.
 * Called after the worker resolves the trusted deployment origin.
 */
export function buildWeeklyFeedbackEmailContent(input: {
  appOrigin: string;
  periodStart: string;
  periodEnd: string;
}) {
  const start = formatWeeklyFeedbackPeriodDate(input.periodStart);
  const end = formatWeeklyFeedbackPeriodDate(input.periodEnd);
  if (
    start === "Data indisponível" ||
    end === "Data indisponível" ||
    input.periodEnd < input.periodStart
  ) {
    throw new Error("Invalid weekly feedback period");
  }

  const feedbackUrl = new URL("/cliente/feedback-semanal", input.appOrigin);
  const subject = "Lembrete do seu Feedback Semanal";
  const bodyText = [
    "Olá,",
    "",
    `Seu Feedback Semanal referente ao período de ${start} a ${end} ainda está disponível para preenchimento no aplicativo.`,
    "",
    "Acesse:",
    feedbackUrl.toString(),
    "",
    "Este lembrete não altera seu atendimento automaticamente.",
    "",
    "Consultoria Corpo & Mente",
  ].join("\n");

  return { subject, bodyText };
}
