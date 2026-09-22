export const PROFESSIONAL_DECISION_OPTIONS = [
  { label: "Manter", value: "maintain" },
  { label: "Simplificar", value: "simplify" },
  { label: "Avançar", value: "advance" },
  { label: "Retornar", value: "return" },
] as const;

export type ProfessionalDecision =
  (typeof PROFESSIONAL_DECISION_OPTIONS)[number]["value"];

const PROFESSIONAL_DECISIONS = new Set<string>(
  PROFESSIONAL_DECISION_OPTIONS.map((option) => option.value),
);

export function isProfessionalDecision(
  value: string,
): value is ProfessionalDecision {
  return PROFESSIONAL_DECISIONS.has(value);
}
