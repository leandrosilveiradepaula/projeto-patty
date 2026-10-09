import type { Json } from "@/lib/supabase/database.types";

export type WeeklyFeedbackInputType = "integer" | "rating_0_10" | "text";

export type WeeklyFeedbackQuestion = {
  allowsNotApplicable: boolean;
  inputType: WeeklyFeedbackInputType;
  key: string;
  label: string;
  required: boolean;
};

export type WeeklyFeedbackDefinition = {
  questions: WeeklyFeedbackQuestion[];
  schemaVersion: number;
  sourceReference: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseWeeklyFeedbackDefinition(
  value: Json,
): WeeklyFeedbackDefinition | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawQuestions = value.questions;
  const schemaVersion = value.schema_version;

  if (
    !Array.isArray(rawQuestions) ||
    rawQuestions.length === 0 ||
    typeof schemaVersion !== "number" ||
    !Number.isSafeInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    return null;
  }

  const questions: WeeklyFeedbackQuestion[] = [];
  const seenKeys = new Set<string>();

  for (const rawQuestion of rawQuestions) {
    if (!isRecord(rawQuestion)) {
      return null;
    }

    const key = rawQuestion.key;
    const label = rawQuestion.label;
    const inputType = rawQuestion.input_type;
    const required = rawQuestion.required;

    if (
      typeof key !== "string" ||
      key.trim().length === 0 ||
      key !== key.trim() ||
      key.length > 120 ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      seenKeys.has(key) ||
      typeof label !== "string" ||
      label.trim().length === 0 ||
      label.length > 500 ||
      (inputType !== "text" &&
        inputType !== "integer" &&
        inputType !== "rating_0_10") ||
      typeof required !== "boolean" ||
      (rawQuestion.allows_not_applicable !== undefined && typeof rawQuestion.allows_not_applicable !== "boolean")
    ) {
      return null;
    }

    seenKeys.add(key);
    questions.push({
      allowsNotApplicable: rawQuestion.allows_not_applicable === true,
      inputType,
      key,
      label,
      required,
    });
  }

  if (value.source_reference !== undefined && value.source_reference !== null &&
      (typeof value.source_reference !== "string" || value.source_reference.length > 500)) {
    return null;
  }

  return {
    questions,
    schemaVersion,
    sourceReference:
      typeof value.source_reference === "string"
        ? value.source_reference
        : null,
  };
}

export function readWeeklyFeedbackAnswer(
  answers: Json,
  questionKey: string,
): string {
  if (!isRecord(answers)) {
    return "";
  }

  const value = answers[questionKey];

  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" ? value : "";
}

/**
 * The weekly feedback asks for factual whole counts and an integer rating.
 * Reject partial numeric strings instead of silently truncating with parseInt.
 */
export function parseWeeklyFeedbackWholeNumber(raw: string): number | null {
  const text = raw.trim();
  if (!/^[0-9]+$/.test(text)) {
    return null;
  }

  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function buildWeeklyFeedbackAnswers(
  formData: FormData,
  definition: WeeklyFeedbackDefinition,
): Record<string, string | number> {
  const answers: Record<string, string | number> = {};

  for (const question of definition.questions) {
    const rawValue = formData.get(question.key);

    if (rawValue !== null && typeof rawValue !== "string") {
      throw new Error(`Resposta inválida para ${question.label}`);
    }
    if (rawValue === null || rawValue.trim() === "") {
      continue;
    }

    if (question.inputType === "integer" || question.inputType === "rating_0_10") {
      const parsed = parseWeeklyFeedbackWholeNumber(rawValue);

      if (parsed === null) {
        throw new Error(`Resposta inválida para ${question.label}`);
      }

      if (question.inputType === "rating_0_10" && parsed > 10) {
        throw new Error(`A nota deve ficar entre 0 e 10: ${question.label}`);
      }

      answers[question.key] = parsed;
      continue;
    }

    const normalizedText = rawValue.trim();
    if (normalizedText.length > 4000) {
      throw new Error(`Resposta muito longa para ${question.label}`);
    }
    answers[question.key] = normalizedText;
  }

  return answers;
}

export function validateWeeklyFeedbackAnswers(
  answers: Record<string, string | number>,
  definition: WeeklyFeedbackDefinition,
) {
  if (!isRecord(answers) || Object.entries(answers).some(([key, value]) => {
    const question = definition.questions.find((item) => item.key === key);
    if (!question) return true;
    if (question.inputType === "text") return typeof value !== "string" || value.length > 4000;
    return typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 ||
      (question.inputType === "rating_0_10" && value > 10);
  })) {
    throw new Error("Respostas do Feedback Semanal inválidas.");
  }
  const missing = definition.questions.filter(
    (question) => question.required && answers[question.key] === undefined,
  );

  if (missing.length > 0) {
    throw new Error("Preencha todas as perguntas obrigatórias antes de enviar.");
  }
}
