import assert from "node:assert/strict";
import test from "node:test";

import type { AnamnesisReviewContext } from "./anamnesis-review-context.ts";
import {
  buildOpenAiAnamnesisReviewRequest,
  extractOpenAiStructuredOutput,
  mapOpenAiReviewOutputToCanonical,
  parseAnamnesisReviewPromptContent,
} from "./openai-anamnesis-review.ts";

const ANSWER_A = "11111111-1111-4111-8111-111111111111";
const ANSWER_B = "22222222-2222-4222-8222-222222222222";
const QUESTION_MISSING = "33333333-3333-4333-8333-333333333333";

const context: AnamnesisReviewContext = {
  allowedMissingTargetQuestionIds: new Set([QUESTION_MISSING]),
  allowedSourceAnswerIds: new Set([ANSWER_A, ANSWER_B]),
  missingTargets: [
    {
      label: "Detalhe ausente",
      question_id: QUESTION_MISSING,
      question_key: "missing",
    },
  ],
  sources: [
    {
      answer_value: "Sim",
      label: "Pergunta A",
      question_id: "44444444-4444-4444-8444-444444444444",
      question_key: "a",
      source_answer_id: ANSWER_A,
    },
    {
      answer_value: "Nao",
      label: "Pergunta B",
      question_id: "55555555-5555-4555-8555-555555555555",
      question_key: "b",
      source_answer_id: ANSWER_B,
    },
  ],
};

test("builds a stateless structured OpenAI request without database ids in provider input", () => {
  const request = buildOpenAiAnamnesisReviewRequest({
    context,
    instructions: "Review only.",
    model: "gpt-test",
  });

  assert.equal(request.body.store, false);
  assert.equal(request.body.model, "gpt-test");
  assert.deepEqual(request.body.reasoning, { effort: "medium" });
  assert.equal(request.body.text.format.type, "json_schema");
  assert.equal(request.body.text.format.strict, true);
  assert.equal(request.body.input.includes(ANSWER_A), false);
  assert.equal(request.body.input.includes(QUESTION_MISSING), false);
  assert.match(request.body.input, /"source_ref":"A1"/);
  assert.match(request.body.input, /"target_ref":"Q1"/);
});

test("maps provider aliases back to canonical ids before validation", () => {
  const request = buildOpenAiAnamnesisReviewRequest({
    context,
    instructions: "Review only.",
    model: "gpt-test",
  });

  const result = mapOpenAiReviewOutputToCanonical({
    aliases: request.aliases,
    context,
    value: {
      findings: [
        {
          type: "possible_contradiction",
          source_refs: ["A1", "A2"],
          target_ref: null,
          explanation: "Pode haver contradicao; requer revisao humana.",
          suggested_follow_up_question: null,
        },
        {
          type: "missing_answer",
          source_refs: [],
          target_ref: "Q1",
          explanation: "Pergunta aplicavel sem resposta.",
          suggested_follow_up_question: "Pode responder?",
        },
      ],
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.value.findings[0].source_answer_ids, [
    ANSWER_A,
    ANSWER_B,
  ]);
  assert.equal(
    result.ok && result.value.findings[1].target_question_id,
    QUESTION_MISSING,
  );
});

test("rejects provider references not issued for this execution", () => {
  const request = buildOpenAiAnamnesisReviewRequest({
    context,
    instructions: "Review only.",
    model: "gpt-test",
  });

  assert.deepEqual(
    mapOpenAiReviewOutputToCanonical({
      aliases: request.aliases,
      context,
      value: {
        findings: [
          {
            type: "clarification_needed",
            source_refs: ["A999"],
            target_ref: null,
            explanation: "Precisa esclarecer.",
            suggested_follow_up_question: null,
          },
        ],
      },
    }),
    { ok: false, error: "unknown_provider_source_ref" },
  );
});

test("extracts structured output and detects refusal/incomplete responses", () => {
  assert.deepEqual(
    extractOpenAiStructuredOutput({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: '{"findings":[]}',
            },
          ],
        },
      ],
    }),
    { ok: true, value: { findings: [] } },
  );

  assert.equal(
    extractOpenAiStructuredOutput({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "No." }],
        },
      ],
    }).ok,
    false,
  );

  assert.deepEqual(
    extractOpenAiStructuredOutput({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [],
    }),
    {
      ok: false,
      code: "response_not_completed",
      message:
        "OpenAI response was not completed: max_output_tokens.",
    },
  );
});

test("validates prompt content shape", () => {
  assert.deepEqual(
    parseAnamnesisReviewPromptContent({
      schema_version: 1,
      instructions: "  Review carefully.  ",
    }),
    { schema_version: 1, instructions: "Review carefully." },
  );

  assert.equal(
    parseAnamnesisReviewPromptContent({
      schema_version: 2,
      instructions: "Review carefully.",
    }),
    null,
  );
});
