import { canonicalizeKnownAssessmentMeasurementKey } from "./assessment-readiness.ts";

export const ASSESSMENT_KIND_OPTIONS = [
  { label: "Básica", value: "fortnightly" },
  { label: "Completa", value: "monthly" },
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

  if (value.startsWith("0000-")) return null;

  const date = new Date(`${value}T12:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date.toISOString();
}

export function parseAssessmentMeasurementNumber(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseMeasurementDraft(input: {
  key: FormDataEntryValue | null;
  unit: FormDataEntryValue | null;
  value: FormDataEntryValue | null;
}) {
  if ([input.key, input.unit, input.value].some((entry) => entry !== null && typeof entry !== "string")) {
    return { error: "Informe dados textuais válidos para a medida." } as const;
  }
  const rawKey = typeof input.key === "string" ? input.key.trim() : "";
  const key = rawKey ? canonicalizeKnownAssessmentMeasurementKey(rawKey) : "";
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  const rawValue = typeof input.value === "string" ? input.value.trim() : "";

  if (!key || key.length > 120 || /[\u0000-\u001f\u007f]/.test(key)) {
    return { error: "Informe uma chave de medida com até 120 caracteres." } as const;
  }

  if (!unit || unit.length > 40 || /[\u0000-\u001f\u007f]/.test(unit)) {
    return { error: "Informe uma unidade com até 40 caracteres." } as const;
  }

  if (!rawValue) {
    return { error: "Informe o valor da medida." } as const;
  }

  if (rawValue.length > 100) {
    return { error: "Informe um valor numérico com até 100 caracteres." } as const;
  }
  const value = parseAssessmentMeasurementNumber(rawValue);

  if (value === null) {
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
