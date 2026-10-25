/** Dados manuais de uma unica versao: nenhuma regra ou meta inferida. */
export type ManualGuidance = {
  manualStageLabel: string | null;
  plannedStartOn: string | null;
  clientInstructions: string | null;
  freeMealGuidance: string | null;
  supplementGuidance: string | null;
  compoundedGuidance: string | null;
};

type Valid = { valid: true; value: ManualGuidance };
type Invalid = { valid: false };

export function isExactCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeManualGuidance(input: {
  manualStageLabel: unknown;
  plannedStartOn: unknown;
  clientInstructions: unknown;
  freeMealGuidance: unknown;
  supplementGuidance: unknown;
  compoundedGuidance: unknown;
}): Valid | Invalid {
  if (typeof input.manualStageLabel !== "string" ||
      typeof input.plannedStartOn !== "string" ||
      typeof input.clientInstructions !== "string" ||
      typeof input.freeMealGuidance !== "string" ||
      typeof input.supplementGuidance !== "string" ||
      typeof input.compoundedGuidance !== "string") return { valid: false };

  const manualStageLabel = input.manualStageLabel.trim() || null;
  const plannedStartOn = input.plannedStartOn.trim() || null;
  const clientInstructions = input.clientInstructions.trim() || null;
  const freeMealGuidance = input.freeMealGuidance.trim() || null;
  const supplementGuidance = input.supplementGuidance.trim() || null;
  const compoundedGuidance = input.compoundedGuidance.trim() || null;
  if ((manualStageLabel && manualStageLabel.length > 120) ||
      (clientInstructions && clientInstructions.length > 4000) ||
      (freeMealGuidance && freeMealGuidance.length > 4000) ||
      (supplementGuidance && supplementGuidance.length > 4000) ||
      (compoundedGuidance && compoundedGuidance.length > 4000) ||
      (plannedStartOn && !isExactCalendarDate(plannedStartOn))) return { valid: false };

  return { valid: true, value: { manualStageLabel, plannedStartOn, clientInstructions,
    freeMealGuidance, supplementGuidance, compoundedGuidance } };
}

export function formatManualStartDate(value: string | null): string {
  if (!value || !isExactCalendarDate(value)) return "Não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
