/** Factual in-app weekly feedback reminder delivery. No read/unread inference. */
export type ClientInAppNoticeEvent = {
  id: string;
  client_id: string;
  weekly_feedback_id: string;
  event_key: string;
  channel_key: string | null;
  delivery_state: string;
  delivered_at: string | null;
  created_at: string;
};

export type ClientInAppFeedback = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  submitted_at: string | null;
};

export type ClientInAppNotice<T extends ClientInAppNoticeEvent = ClientInAppNoticeEvent> = {
  event: T;
  feedback: ClientInAppFeedback;
  status: "pending" | "responded";
  recordedAt: string;
};

function instant(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Project only delivered in-app events for weekly feedbacks that the signed-in
 * client can already read. Never classify a queued/blocked external delivery
 * as a message in the client inbox, and never invent receipt/read timestamps.
 */
export function clientInAppFeedbackNotices<T extends ClientInAppNoticeEvent>(
  events: readonly T[],
  feedbacks: readonly ClientInAppFeedback[],
  currentClientId: string,
): ClientInAppNotice<T>[] {
  const visibleFeedbacks = new Map(
    feedbacks
      .filter((feedback) => feedback.client_id === currentClientId)
      .map((feedback) => [feedback.id, feedback]),
  );

  return events.flatMap((event) => {
    if (
      event.client_id !== currentClientId ||
      event.channel_key !== "in_app" ||
      event.delivery_state !== "delivered" ||
      !event.event_key.startsWith("weekly_feedback_reminder:")
    ) return [];

    const feedback = visibleFeedbacks.get(event.weekly_feedback_id);
    if (!feedback) return [];

    return [{
      event,
      feedback,
      status: feedback.submitted_at === null ? "pending" as const : "responded" as const,
      recordedAt: event.delivered_at || event.created_at,
    }];
  }).sort((a, b) => {
    const left = instant(a.recordedAt);
    const right = instant(b.recordedAt);
    if (left === null || right === null) {
      if (left === null && right !== null) return 1;
      if (left !== null && right === null) return -1;
      return a.event.id.localeCompare(b.event.id);
    }
    return right - left || a.event.id.localeCompare(b.event.id);
  });
}

/** Periods are calendar dates and are not interpreted as a clinical deadline. */
export function formatInAppFeedbackPeriodDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Data indisponível";
  const date = new Date(value + "T12:00:00-03:00");
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  const parts = value.split("-").map(Number);
  if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() + 1 !== parts[1] ||
      date.getUTCDate() !== parts[2]) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function formatInAppNoticeTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(date);
}
