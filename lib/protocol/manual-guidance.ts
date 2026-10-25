/** Dados manuais de uma unica versao: nenhuma regra ou meta inferida. */
export type ManualGuidance = {
  manualStageLabel: string | null;
  plannedStartOn: string | null;
  clientInstructions: string | null;
};

type Valid = { valid: true; value: ManualGuidance };
type Invalid = { valid: false };

export function isExactCalendarDate(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeManualGuidance(input: {
  manualStageLabel: unknown;
  plannedStartOn: unknown;
  clientInstructions: unknown;
}): Valid | Invalid {
  if (typeof input.manualStageLabel !== "string" ||
      typeof input.plannedStartOn !== "string" ||
      typeof input.clientInstructions !== "string") return { valid: false };

  const manualStageLabel = input.manualStageLabel.trim() || null;
  const plannedStartOn = input.plannedStartOn.trim() || null;
  const clientInstructions = input.clientInstructions.trim() || null;
  if ((manualStageLabel && manualStageLabel.length > 120) ||
      (clientInstructions && clientInstructions.length > 4000) ||
      (plannedStartOn && !isExactCalendarDate(plannedStartOn))) return { valid: false };

  return { valid: true, value: { manualStageLabel, plannedStartOn, clientInstructions } };
}

export function formatManualStartDate(value: string | null): string {
  if (!value || !isExactCalendarDate(value)) return "Não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
