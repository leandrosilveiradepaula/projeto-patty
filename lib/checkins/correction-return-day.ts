import { parseCheckinHistoryDay } from "./history-day.ts";

/**
 * Derive the return day from the original event read through the authorized
 * client-scoped boundary. A hidden form field is only a fallback when no
 * usable event day is available; it must never override an authorized event.
 */
export function authorizedCorrectionHistoryDay(
  kind: "liquido" | "atividade",
  event: { recorded_at?: string | null; checkin_date?: string | null } | null | undefined,
  submittedDay: unknown,
  today: string,
): string | null {
  if (kind === "atividade") {
    const activityDay = parseCheckinHistoryDay(event?.checkin_date, today);
    if (activityDay) return activityDay;
  } else if (typeof event?.recorded_at === "string") {
    const instant = new Date(event.recorded_at);
    if (Number.isFinite(instant.getTime())) {
      const liquidDay = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(instant);
      const validatedDay = parseCheckinHistoryDay(liquidDay, today);
      if (validatedDay) return validatedDay;
    }
  }
  return parseCheckinHistoryDay(submittedDay, today);
}
