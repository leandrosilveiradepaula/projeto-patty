import type { Json } from "@/lib/supabase/database.types";

export type AnamnesisApplicabilityRule = {
  sourceQuestionId: string;
  expectedAnswer: unknown;
};

export type AnamnesisQuestionApplicabilityDefinition = {
  applicability_expected_answer: Json | null;
  applicability_source_question_id: string | null;
  id: string;
};

export type AnamnesisAnswerForApplicability = {
  answer_value: Json;
  question_id: string;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);

  return `{${entries.join(",")}}`;
}

export function isAnamnesisQuestionApplicable(
  rule: AnamnesisApplicabilityRule | null,
  answersByQuestionId: ReadonlyMap<string, unknown>,
): boolean {
  if (!rule) {
    return true;
  }

  if (!answersByQuestionId.has(rule.sourceQuestionId)) {
    return false;
  }

  const actualAnswer = answersByQuestionId.get(rule.sourceQuestionId);

  return stableJson(actualAnswer) === stableJson(rule.expectedAnswer);
}

export function getApplicableAnamnesisQuestionIds(
  questions: AnamnesisQuestionApplicabilityDefinition[],
  answers: AnamnesisAnswerForApplicability[],
) {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer.answer_value]),
  );
  const memo = new Map<string, boolean>();
  const visiting = new Set<string>();

  function isApplicable(questionId: string): boolean {
    const cached = memo.get(questionId);

    if (cached !== undefined) {
      return cached;
    }

    const question = questionsById.get(questionId);

    if (!question || visiting.has(questionId)) {
      return false;
    }

    const sourceQuestionId = question.applicability_source_question_id;
    const expectedAnswer = question.applicability_expected_answer;

    if (sourceQuestionId === null && expectedAnswer === null) {
      memo.set(questionId, true);
      return true;
    }

    if (sourceQuestionId === null || expectedAnswer === null) {
      memo.set(questionId, false);
      return false;
    }

    visiting.add(questionId);

    const sourceApplicable = isApplicable(sourceQuestionId);
    const applicable =
      sourceApplicable &&
      isAnamnesisQuestionApplicable(
        {
          sourceQuestionId,
          expectedAnswer,
        },
        answersByQuestionId,
      );

    visiting.delete(questionId);
    memo.set(questionId, applicable);

    return applicable;
  }

  return new Set(
    questions
      .filter((question) => isApplicable(question.id))
      .map((question) => question.id),
  );
}
