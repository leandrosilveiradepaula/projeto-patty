/** A malformed legacy event must never block the professional operations queue. */
export function formatPendingQueueDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit",
    timeZone: "America/Sao_Paulo", year: "numeric",
  }).format(date);
}
