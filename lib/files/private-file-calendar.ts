/** Date of an authorized file event in the calendar shown by the UI.
 * Do not infer a date from an invalid historical timestamp.
 */
export function privateFileSaoPauloDay(value: string | null | undefined): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function privateFileSaoPauloYear(value: string | null | undefined): string | null {
  return privateFileSaoPauloDay(value)?.slice(0, 4) ?? null;
}

export function privateFileSaoPauloMonth(value: string | null | undefined): string | null {
  return privateFileSaoPauloDay(value)?.slice(5, 7) ?? null;
}

/** For labels, not access control or interpretation of the photo itself. */
export function privateFileSaoPauloDateTime(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
