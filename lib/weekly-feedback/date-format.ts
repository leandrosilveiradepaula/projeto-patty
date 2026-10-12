const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Display scheduled weekly periods without interpreting a legacy invalid date as a valid week. */
export function formatWeeklyFeedbackPeriodDate(value: string): string {
  const match = dateOnly.exec(value);
  if (!match) return "Data indisponível";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return "Data indisponível";
  }
  const actual = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    !Number.isFinite(actual.getTime()) ||
    actual.getUTCFullYear() !== year ||
    actual.getUTCMonth() + 1 !== month ||
    actual.getUTCDate() !== day
  ) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(actual);
}

/** Missing or corrupt legacy deadlines must not crash the entire feedback page. */
export function formatWeeklyFeedbackDueDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(date);
}
