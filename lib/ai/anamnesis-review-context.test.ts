import assert from "node:assert/strict";
import test from "node:test";

import {
  AnamnesisReviewContextBuildError,
  buildAnamnesisReviewContext,
} from "./anamnesis-review-context.ts";

const SUBMISSION = "10000000-0000-4000-8000-000000000001";
const VERSION = "20000000-0000-4000-8000-000000000001";

const questions = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    question_key: "ordinary",
    label: "Ordinary",
    applicability_source_question_id: null,
    applicability_expected_answer: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    question_key: "instagram",
    label: "Instagram",
    applicability_source_question_id: null,
    applicability_expected_answer: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    question_key: "financial_capacity_for_supplements",
    label: "Financial",
    applicability_source_question_id: null,
    applicability_expected_answer: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    question_key: "has_condition",
    label: "Has condition",
    applicability_source_question_id: null,
    applicability_expected_answer: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    question_key: "condition_details",
    label: "Condition details",
    applicability_source_question_id:
      "30000000-0000-4000-8000-000000000004",
    applicability_expected_answer: "Sim",
  },
];

const answers = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    submission_id: SUBMISSION,
    form_version_id: VERSION,
    question_id: questions[0].id,
    answer_value: "ordinary answer",
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    submission_id: SUBMISSION,
    form_version_id: VERSION,
    question_id: questions[1].id,
    answer_value: "@private",
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    submission_id: SUBMISSION,
    form_version_id: VERSION,
    question_id: questions[2].id,
    answer_value: "Talvez",
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    submission_id: SUBMISSION,
    form_version_id: VERSION,
    question_id: questions[3].id,
    answer_value: "Nao",
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    submission_id: SUBMISSION,
    form_version_id: VERSION,
    question_id: questions[4].id,
    answer_value: "stored but hidden",
  },
];

test("minimizes automatic context and excludes hidden answers", () => {
  const context = buildAnamnesisReviewContext({
    answers,
    formVersionId: VERSION,
    questions,
    submissionId: SUBMISSION,
  });

  assert.deepEqual(
    context.sources.map((source) => source.question_key),
    ["ordinary", "has_condition"],
  );
  assert.deepEqual(
    [...context.allowedSourceAnswerIds],
    [answers[0].id, answers[3].id],
  );
  assert.equal(
    context.allowedSourceAnswerIds.has(answers[4].id),
    false,
    "stored answer for a hidden conditional question must not be sent",
  );
});

test("financial capacity is included only by explicit answer selection", () => {
  const context = buildAnamnesisReviewContext({
    answers,
    explicitlyIncludedAnswerIds: [answers[2].id],
    formVersionId: VERSION,
    questions,
    submissionId: SUBMISSION,
  });

  assert.deepEqual(
    context.sources.map((source) => source.question_key),
    ["ordinary", "financial_capacity_for_supplements", "has_condition"],
  );
});

test("instagram cannot be opted into this purpose", () => {
  assert.throws(
    () =>
      buildAnamnesisReviewContext({
        answers,
        explicitlyIncludedAnswerIds: [answers[1].id],
        formVersionId: VERSION,
        questions,
        submissionId: SUBMISSION,
      }),
    (error) =>
      error instanceof AnamnesisReviewContextBuildError &&
      error.code === "explicit_source_not_allowed",
  );
});

test("missing targets include only applicable unanswered questions", () => {
  const context = buildAnamnesisReviewContext({
    answers: answers.filter(
      (answer) =>
        answer.question_id !== questions[0].id &&
        answer.question_id !== questions[4].id,
    ),
    formVersionId: VERSION,
    questions,
    submissionId: SUBMISSION,
  });

  assert.deepEqual(
    [...context.allowedMissingTargetQuestionIds],
    [questions[0].id],
  );
  assert.equal(
    context.allowedMissingTargetQuestionIds.has(questions[4].id),
    false,
    "hidden conditional question must not become missing_answer",
  );
});

test("cross-submission answers are rejected before context construction", () => {
  assert.throws(
    () =>
      buildAnamnesisReviewContext({
        answers: [
          {
            ...answers[0],
            submission_id: "10000000-0000-4000-8000-000000000099",
          },
        ],
        formVersionId: VERSION,
        questions,
        submissionId: SUBMISSION,
      }),
    (error) =>
      error instanceof AnamnesisReviewContextBuildError &&
      error.code === "answer_submission_mismatch",
  );
});
