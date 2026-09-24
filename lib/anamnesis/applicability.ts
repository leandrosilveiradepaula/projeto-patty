import type { Json } from "@/lib/supabase/database.types";

export type AnamnesisQuestionApplicabilityDefinition = {
  applicability_expected_answer: Json | null;
  applicability_source_question_id: string | null;
  id: string;
};

export type AnamnesisAnswerForApplicability = {
  answer_value: Json;
  question_id: string;
};

function isJsonRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function areJsonValuesEqual(left: Json, right: Json): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    return (
      left.length === right.length &&
      left.every((value, index) => areJsonValuesEqual(value, right[index] as Json))
    );
  }

  if (isJsonRecord(left) || isJsonRecord(right)) {
    if (!isJsonRecord(left) || !isJsonRecord(right)) {
      return false;
    }

    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();

    if (
      leftKeys.length !== rightKeys.length ||
      !leftKeys.every((key, index) => key === rightKeys[index])
    ) {
      return false;
    }

    return leftKeys.every((key) => {
      const leftValue = left[key];
      const rightValue = right[key];

      return (
        leftValue !== undefined &&
        rightValue !== undefined &&
        areJsonValuesEqual(leftValue, rightValue)
      );
    });
  }

  return false;
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
    const sourceAnswer = answersByQuestionId.get(sourceQuestionId);
    const applicable =
      sourceApplicable &&
      sourceAnswer !== undefined &&
      areJsonValuesEqual(sourceAnswer, expectedAnswer);

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
