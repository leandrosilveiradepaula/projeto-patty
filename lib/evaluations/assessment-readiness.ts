import type { AssessmentKind } from "./assessment-draft.ts";

export type AssessmentReadinessInput = {
  assessmentKind: AssessmentKind;
  measurementKeys: string[];
  photoCount: number;
};

export type AssessmentReadinessItem = {
  key: string;
  label: string;
  present: boolean;
};

export type AssessmentFinalizationReadiness = {
  canFinalizeDeterministically: boolean;
  requiresMonthlyManualConfirmation: boolean;
  items: AssessmentReadinessItem[];
};

const KNOWN_ALIASES: Record<string, string> = {
  abdominal: "abdomen",
  abdomen: "abdomen",
  cintura: "cintura",
  hip: "quadril",
  peso: "peso",
  quadril: "quadril",
  waist: "cintura",
  weight: "peso",
};

const LABELS: Record<string, string> = {
  abdomen: "Abdômen",
  cintura: "Cintura",
  foto: "Foto vinculada",
  peso: "Peso",
  quadril: "Quadril",
};

export function normalizeAssessmentMeasurementKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  return KNOWN_ALIASES[normalized] ?? normalized;
}

export function canonicalizeKnownAssessmentMeasurementKey(value: string) {
  const normalized = normalizeAssessmentMeasurementKey(value);

  if (normalized in LABELS && normalized !== "foto") {
    return normalized;
  }

  return value.trim();
}

export function buildAssessmentFinalizationReadiness({
  assessmentKind,
  measurementKeys,
  photoCount,
}: AssessmentReadinessInput): AssessmentFinalizationReadiness {
  const presentKeys = new Set(
    measurementKeys.map((key) => normalizeAssessmentMeasurementKey(key)),
  );

  const requiredKeys =
    assessmentKind === "fortnightly"
      ? ["peso", "cintura", "abdomen", "quadril"]
      : ["peso"];

  const items: AssessmentReadinessItem[] = requiredKeys.map((key) => ({
    key,
    label: LABELS[key],
    present: presentKeys.has(key),
  }));

  if (assessmentKind === "monthly") {
    items.push({
      key: "foto",
      label: LABELS.foto,
      present: photoCount > 0,
    });
  }

  return {
    canFinalizeDeterministically: items.every((item) => item.present),
    requiresMonthlyManualConfirmation: assessmentKind === "monthly",
    items,
  };
}
