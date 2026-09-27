export const ASSESSMENT_KIND_OPTIONS = [
  { label: "Quinzenal", value: "fortnightly" },
  { label: "Mensal", value: "monthly" },
] as const;

export type AssessmentKind =
  (typeof ASSESSMENT_KIND_OPTIONS)[number]["value"];

export function isAssessmentKind(value: string): value is AssessmentKind {
  return ASSESSMENT_KIND_OPTIONS.some((option) => option.value === value);
}

export function assessmentKindLabel(value: string | null) {
  return (
    ASSESSMENT_KIND_OPTIONS.find((option) => option.value === value)?.label ??
    "Legada / não classificada"
  );
}

export function parseAssessmentDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date.toISOString();
}

export function parseMeasurementDraft(input: {
  key: FormDataEntryValue | null;
  unit: FormDataEntryValue | null;
  value: FormDataEntryValue | null;
}) {
  const key = typeof input.key === "string" ? input.key.trim() : "";
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  const rawValue = typeof input.value === "string" ? input.value.trim() : "";

  if (!key || key.length > 120) {
    return { error: "Informe uma chave de medida com até 120 caracteres." } as const;
  }

  if (!unit || unit.length > 40) {
    return { error: "Informe uma unidade com até 40 caracteres." } as const;
  }

  if (!rawValue) {
    return { error: "Informe o valor da medida." } as const;
  }

  const normalizedValue = rawValue.replace(",", ".");
  const value = Number(normalizedValue);

  if (!Number.isFinite(value)) {
    return { error: "Informe um valor numérico válido." } as const;
  }

  return {
    data: {
      key,
      unit,
      value,
    },
  } as const;
}
