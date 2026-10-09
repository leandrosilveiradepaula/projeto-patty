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
  items: AssessmentReadinessItem[];
};

const KNOWN_ALIASES: Record<string, string> = {
  abdominal: "abdomen",
  abdomen: "abdomen",
  biceps: "biceps",
  bust: "torax",
  busto: "torax",
  chest: "torax",
  coxa: "coxa",
  cintura: "cintura",
  hip: "quadril",
  ombro: "ombros",
  ombros: "ombros",
  panturrilha: "panturrilhas",
  panturrilhas: "panturrilhas",
  peito: "torax",
  peso: "peso",
  quadril: "quadril",
  thigh: "coxa",
  waist: "cintura",
  weight: "peso",
};

const LABELS: Record<string, string> = {
  abdomen: "Abdômen",
  biceps: "Bíceps direito",
  cintura: "Cintura",
  coxa: "Coxa direita",
  foto: "Foto vinculada",
  ombros: "Ombros",
  panturrilhas: "Panturrilha direita",
  peso: "Peso",
  quadril: "Quadril",
  torax: "Busto/peito",
};

const BASIC_KEYS = ["peso", "cintura", "abdomen", "quadril"] as const;
const COMPLETE_KEYS = [
  "peso",
  "cintura",
  "abdomen",
  "coxa",
  "biceps",
  "torax",
  "quadril",
  "ombros",
  "panturrilhas",
] as const;

export function normalizeAssessmentMeasurementKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  return Object.prototype.hasOwnProperty.call(KNOWN_ALIASES, normalized)
    ? KNOWN_ALIASES[normalized]
    : normalized;
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
    assessmentKind === "fortnightly" ? BASIC_KEYS : COMPLETE_KEYS;

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
    items,
  };
}
