import assert from "node:assert/strict";
import test from "node:test";

import { validateAnamnesisReviewOutput } from "./anamnesis-review-output.ts";

const ANSWER_A = "11111111-1111-4111-8111-111111111111";
const ANSWER_B = "22222222-2222-4222-8222-222222222222";
const ANSWER_C = "33333333-3333-4333-8333-333333333333";

const allowedSourceAnswerIds = new Set([ANSWER_A, ANSWER_B, ANSWER_C]);

test("accepts an empty findings array", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: { findings: [] },
    }),
    {
      ok: true,
      value: { findings: [] },
    },
  );
});

test("accepts the two confirmed finding types with valid sources", () => {
  const result = validateAnamnesisReviewOutput({
    allowedSourceAnswerIds,
    value: {
      findings: [
        {
          type: "possible_contradiction",
          source_answer_ids: [ANSWER_A, ANSWER_B],
          explanation:
            "Pode haver uma incompatibilidade entre as respostas; requer revisão humana.",
        },
        {
          type: "clarification_needed",
          source_answer_ids: [ANSWER_C],
          explanation:
            "A resposta pode ser insuficiente para uma interpretação segura.",
          suggested_follow_up_question: "Você pode detalhar esta resposta?",
        },
      ],
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value.findings.length, 2);
});

test("rejects extra top-level properties", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: { findings: [], score: 0.8 },
    }),
    { ok: false, error: "invalid_top_level_properties" },
  );
});

test("rejects extra finding properties such as scores or diagnoses", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [ANSWER_A],
            explanation: "Pode precisar de esclarecimento.",
            score: 0.9,
          },
        ],
      },
    }),
    { ok: false, error: "invalid_finding_properties" },
  );
});

test("rejects unsupported finding types including missing_answer", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "missing_answer",
            source_answer_ids: [ANSWER_A],
            explanation: "Resposta ausente.",
          },
        ],
      },
    }),
    { ok: false, error: "invalid_finding_type" },
  );
});

test("requires at least two distinct sources for possible contradiction", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "possible_contradiction",
            source_answer_ids: [ANSWER_A],
            explanation: "Pode haver contradição.",
          },
        ],
      },
    }),
    { ok: false, error: "insufficient_sources" },
  );

  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "possible_contradiction",
            source_answer_ids: [ANSWER_A, ANSWER_A],
            explanation: "Pode haver contradição.",
          },
        ],
      },
    }),
    { ok: false, error: "invalid_source_answer_ids" },
  );
});

test("requires at least one source for clarification needed", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [],
            explanation: "Pode precisar de esclarecimento.",
          },
        ],
      },
    }),
    { ok: false, error: "invalid_source_answer_ids" },
  );
});

test("rejects source ids not present in the execution source allowlist", () => {
  const otherAnswer = "44444444-4444-4444-8444-444444444444";

  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [otherAnswer],
            explanation: "Pode precisar de esclarecimento.",
          },
        ],
      },
    }),
    { ok: false, error: "source_answer_not_allowed" },
  );
});

test("rejects malformed source ids", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: ["not-a-uuid"],
            explanation: "Pode precisar de esclarecimento.",
          },
        ],
      },
    }),
    { ok: false, error: "invalid_source_answer_ids" },
  );
});

test("requires non-blank explanation and optional follow-up question", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [ANSWER_A],
            explanation: "   ",
          },
        ],
      },
    }),
    { ok: false, error: "invalid_explanation" },
  );

  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [ANSWER_A],
            explanation: "Pode precisar de esclarecimento.",
            suggested_follow_up_question: "   ",
          },
        ],
      },
    }),
    { ok: false, error: "invalid_follow_up_question" },
  );
});

test("normalizes surrounding whitespace without rewriting content", () => {
  assert.deepEqual(
    validateAnamnesisReviewOutput({
      allowedSourceAnswerIds,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [ANSWER_A],
            explanation: "  Pode precisar de esclarecimento.  ",
            suggested_follow_up_question: "  Pode explicar melhor?  ",
          },
        ],
      },
    }),
    {
      ok: true,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_answer_ids: [ANSWER_A],
            explanation: "Pode precisar de esclarecimento.",
            suggested_follow_up_question: "Pode explicar melhor?",
          },
        ],
      },
    },
  );
});
