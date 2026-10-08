/**
 * Check calendar validity rather than accepting a YYYY-MM-DD string whose
 * month/day cannot actually exist. No professional period length is imposed.
 */
export function isValidWeeklyFeedbackCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value + "T12:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type OptionalFeedbackDeadline =
  | { ok: true; dueAt: string | null }
  | { ok: false };

/**
 * The manual form submits a local date/time without a zone.
 * Preserve the existing Sao Paulo offset convention without assuming a
 * professional deadline when the field is blank.
 */
export function parseOptionalWeeklyFeedbackDueAt(value: unknown): OptionalFeedbackDeadline {
  if (value === null || value === "") {
    return { ok: true, dueAt: null };
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ||
    !isValidWeeklyFeedbackCalendarDay(value.slice(0, 10))
  ) {
    return { ok: false };
  }

  const parsed = new Date(value + ":00-03:00");
  if (!Number.isFinite(parsed.getTime())) {
    return { ok: false };
  }

  return { ok: true, dueAt: parsed.toISOString() };
}
