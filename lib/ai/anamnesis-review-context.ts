import { getApplicableAnamnesisQuestionIds } from "../anamnesis/applicability.ts";
import type { Json } from "@/lib/supabase/database.types";

const ALWAYS_EXCLUDED_QUESTION_KEYS = new Set(["instagram"]);
const EXPLICIT_ONLY_QUESTION_KEYS = new Set([
  "financial_capacity_for_supplements",
]);

export type AnamnesisReviewContextQuestion = {
  applicability_expected_answer: Json | null;
  applicability_source_question_id: string | null;
  form_version_id: string;
  id: string;
  label: string;
  question_key: string;
};

export type AnamnesisReviewContextAnswer = {
  answer_value: Json;
  form_version_id: string;
  id: string;
  question_id: string;
  submission_id: string;
};

export type AnamnesisReviewSourcePayload = {
  answer_value: Json;
  label: string;
  question_id: string;
  question_key: string;
  source_answer_id: string;
};

export type AnamnesisReviewMissingTarget = {
  label: string;
  question_id: string;
  question_key: string;
};

export type AnamnesisReviewContext = {
  allowedMissingTargetQuestionIds: ReadonlySet<string>;
  allowedSourceAnswerIds: ReadonlySet<string>;
  missingTargets: AnamnesisReviewMissingTarget[];
  sources: AnamnesisReviewSourcePayload[];
};

export type AnamnesisReviewContextBuildErrorCode =
  | "question_form_version_mismatch"
  | "answer_submission_mismatch"
  | "answer_form_version_mismatch"
  | "answer_question_unknown"
  | "duplicate_answer_for_question"
  | "explicit_source_unknown"
  | "explicit_source_not_allowed"
  | "explicit_source_not_applicable";

export class AnamnesisReviewContextBuildError extends Error {
  readonly code: AnamnesisReviewContextBuildErrorCode;

  constructor(code: AnamnesisReviewContextBuildErrorCode) {
    super(code);
    this.code = code;
    this.name = "AnamnesisReviewContextBuildError";
  }
}

export function buildAnamnesisReviewContext(input: {
  answers: AnamnesisReviewContextAnswer[];
  explicitlyIncludedAnswerIds?: readonly string[];
  formVersionId: string;
  questions: AnamnesisReviewContextQuestion[];
  submissionId: string;
}): AnamnesisReviewContext {
  for (const question of input.questions) {
    if (question.form_version_id !== input.formVersionId) {
      throw new AnamnesisReviewContextBuildError(
        "question_form_version_mismatch",
      );
    }
  }

  const questionsById = new Map(
    input.questions.map((question) => [question.id, question]),
  );
  const answersById = new Map<string, AnamnesisReviewContextAnswer>();
  const answersByQuestionId = new Map<string, AnamnesisReviewContextAnswer>();

  for (const answer of input.answers) {
    if (answer.submission_id !== input.submissionId) {
      throw new AnamnesisReviewContextBuildError("answer_submission_mismatch");
    }

    if (answer.form_version_id !== input.formVersionId) {
      throw new AnamnesisReviewContextBuildError("answer_form_version_mismatch");
    }

    if (!questionsById.has(answer.question_id)) {
      throw new AnamnesisReviewContextBuildError("answer_question_unknown");
    }

    if (answersByQuestionId.has(answer.question_id)) {
      throw new AnamnesisReviewContextBuildError(
        "duplicate_answer_for_question",
      );
    }

    answersById.set(answer.id, answer);
    answersByQuestionId.set(answer.question_id, answer);
  }

  const applicableQuestionIds = getApplicableAnamnesisQuestionIds(
    input.questions,
    input.answers,
  );
  const explicitlyIncludedAnswerIds = new Set(
    input.explicitlyIncludedAnswerIds ?? [],
  );

  for (const answerId of explicitlyIncludedAnswerIds) {
    const answer = answersById.get(answerId);

    if (!answer) {
      throw new AnamnesisReviewContextBuildError("explicit_source_unknown");
    }

    const question = questionsById.get(answer.question_id);

    if (
      !question ||
      !EXPLICIT_ONLY_QUESTION_KEYS.has(question.question_key)
    ) {
      throw new AnamnesisReviewContextBuildError(
        "explicit_source_not_allowed",
      );
    }

    if (!applicableQuestionIds.has(question.id)) {
      throw new AnamnesisReviewContextBuildError(
        "explicit_source_not_applicable",
      );
    }
  }

  const sources: AnamnesisReviewSourcePayload[] = [];

  for (const question of input.questions) {
    const answer = answersByQuestionId.get(question.id);

    if (!answer || !applicableQuestionIds.has(question.id)) {
      continue;
    }

    if (ALWAYS_EXCLUDED_QUESTION_KEYS.has(question.question_key)) {
      continue;
    }

    if (
      EXPLICIT_ONLY_QUESTION_KEYS.has(question.question_key) &&
      !explicitlyIncludedAnswerIds.has(answer.id)
    ) {
      continue;
    }

    sources.push({
      answer_value: answer.answer_value,
      label: question.label,
      question_id: question.id,
      question_key: question.question_key,
      source_answer_id: answer.id,
    });
  }

  const missingTargets = input.questions
    .filter(
      (question) =>
        applicableQuestionIds.has(question.id) &&
        !answersByQuestionId.has(question.id),
    )
    .map((question) => ({
      label: question.label,
      question_id: question.id,
      question_key: question.question_key,
    }));

  const allowedMissingTargetQuestionIds = new Set(
    missingTargets.map((target) => target.question_id),
  );

  return {
    allowedMissingTargetQuestionIds,
    allowedSourceAnswerIds: new Set(
      sources.map((source) => source.source_answer_id),
    ),
    missingTargets,
    sources,
  };
}
