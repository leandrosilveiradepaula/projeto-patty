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

/**
 * A validation issue never contains the value supplied by a client. It can
 * safely be used for field-level guidance without logging sensitive answers.
 */
export class WeeklyFeedbackFieldValidationError extends Error {
  constructor(
    public readonly questionKey: string,
    message: string,
  ) {
    super(message);
    this.name = "WeeklyFeedbackFieldValidationError";
  }
}

export function getWeeklyFeedbackFieldError(
  question: WeeklyFeedbackQuestion,
  value: string,
  finalSubmit: boolean,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return finalSubmit && question.required ? "Preencha esta pergunta antes de enviar." : null;
  }
  if (question.inputType === "text") {
    return trimmed.length > 4000 ? "A resposta ultrapassa 4.000 caracteres." : null;
  }
  const parsed = parseWeeklyFeedbackWholeNumber(trimmed);
  if (parsed === null) {
    return "Informe um número inteiro válido, sem sinais, decimais ou letras.";
  }
  if (question.inputType === "rating_0_10" && parsed > 10) {
    return "A nota deve ficar entre 0 e 10.";
  }
  return null;
}

export function summarizeWeeklyFeedbackRequiredProgress(
  questions: readonly WeeklyFeedbackQuestion[],
  values: Readonly<Record<string, string>>,
) {
  let completed = 0;
  let required = 0;
  let requiredCompleted = 0;
  let firstMissingRequired: string | null = null;
  for (const question of questions) {
    const hasValue = (values[question.key] ?? "").trim().length > 0;
    if (hasValue) completed++;
    if (question.required) {
      required++;
      if (hasValue) requiredCompleted++;
      else if (!firstMissingRequired) firstMissingRequired = question.key;
    }
  }
  return { completed, total: questions.length, required, requiredCompleted, firstMissingRequired };
}

export function firstInvalidWeeklyFeedbackField(
  questions: readonly WeeklyFeedbackQuestion[],
  values: Readonly<Record<string, string>>,
  finalSubmit: boolean,
): string | null {
  for (const question of questions) {
    if (getWeeklyFeedbackFieldError(question, values[question.key] ?? "", finalSubmit)) {
      return question.key;
    }
  }
  return null;
}

/** No inferred applicability: this is only a client-provided answer shortcut. */
export function mayUseExplicitNotApplicable(question: WeeklyFeedbackQuestion) {
  return question.allowsNotApplicable && question.inputType === "text";
}

export function buildWeeklyFeedbackAnswers(
  formData: FormData,
  definition: WeeklyFeedbackDefinition,
): Record<string, string | number> {
  const answers: Record<string, string | number> = {};

  for (const question of definition.questions) {
    const received = formData.getAll(question.key);
    // Ambiguous multi-valued answers must not silently pick an arbitrary first value.
    if (received.length > 1 || (received.length === 1 && typeof received[0] !== "string")) {
      throw new WeeklyFeedbackFieldValidationError(
        question.key,
        "Resposta inválida. Informe somente um valor para esta pergunta.",
      );
    }
    const raw = received.length === 1 ? received[0] as string : "";
    const issue = getWeeklyFeedbackFieldError(question, raw, false);
    if (issue) {
      const legacyPrefix = issue.includes("ultrapassa")
        ? "Resposta muito longa"
        : issue.includes("nota")
          ? "A nota deve ficar entre 0 e 10"
          : "Resposta inválida";
      throw new WeeklyFeedbackFieldValidationError(question.key, legacyPrefix + ": " + question.label + ". " + issue);
    }
    if (!raw.trim()) continue;
    if (question.inputType === "text") {
      answers[question.key] = raw.trim();
    } else {
      // getWeeklyFeedbackFieldError has already validated integer and rating limits.
      answers[question.key] = parseWeeklyFeedbackWholeNumber(raw)!;
    }
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
    throw new WeeklyFeedbackFieldValidationError(
      missing[0].key,
      "Preencha todas as perguntas obrigatórias antes de enviar.",
    );
  }
}
