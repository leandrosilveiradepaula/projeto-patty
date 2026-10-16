import {
  describeAdminFeedbackReminder,
  type AdminFeedbackReminderDisplay,
  type AdminFeedbackReminderEvent,
} from "../operations/admin-feedback-reminder.ts";

/**
 * Factual delivery history for a weekly request. Manual requests do not
 * participate in the scheduled reminder job, but actual recorded evidence
 * always takes precedence over an assumption based on the request source.
 * A persisted blocked event is historical: it does not prove the channel
 * remains misconfigured after the professional changes it.
 */
export function describeWeeklyFeedbackReminderEvidence(
  requestSource: string,
  lastEvent: AdminFeedbackReminderEvent | null | undefined,
): AdminFeedbackReminderDisplay {
  const recorded = describeAdminFeedbackReminder(lastEvent);
  if (recorded) {
    return {
      ...recorded,
      label: "Último evento registrado: " + recorded.label,
    };
  }
  if (requestSource === "manual") {
    return { label: "Solicitação manual — lembrete automático não programado." };
  }
  if (requestSource === "schedule") {
    return { label: "Nenhum evento de lembrete registrado." };
  }
  return { label: "Origem não identificada — nenhum evento de lembrete registrado." };
}
