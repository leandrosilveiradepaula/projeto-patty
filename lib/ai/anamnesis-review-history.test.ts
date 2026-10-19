import assert from "node:assert/strict";
import test from "node:test";

import { presentStoredAiReview } from "./anamnesis-review-history.ts";

const ANSWER_A = "11111111-1111-4111-8111-111111111111";
const ANSWER_B = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ANSWER = "99999999-9999-4999-8999-999999999999";
const MISSING_QUESTION = "33333333-3333-4333-8333-333333333333";
const OUTSIDER_QUESTION = "88888888-8888-4888-8888-888888888888";

const allowedSourceAnswerIds = new Set([ANSWER_A, ANSWER_B]);
const allowedMissingTargetQuestionIds = new Set([MISSING_QUESTION]);
const completedAt = "2026-10-19T03:00:00.000Z";

function present(
  content: unknown,
  overrides: Partial<Parameters<typeof presentStoredAiReview>[0]> = {},
) {
  return presentStoredAiReview({
    allowedMissingTargetQuestionIds,
    allowedSourceAnswerIds,
    completedAt,
    content,
    failedAt: null,
    status: "completed",
    ...overrides,
  });
}

test("a truly empty validated result is distinguishable from a missing result", () => {
  assert.deepEqual(present({ findings: [] }), {
    findings: [],
    state: "ready",
  });
  assert.deepEqual(present(undefined), {
    findings: [],
    state: "missing_output",
  });
  assert.equal(present(null).state, "missing_output");
});

test("invalid output never produces partial findings or professional actions", () => {
  assert.deepEqual(
    present({
      findings: [
        {
          type: "clarification_needed",
          source_answer_ids: [ANSWER_A],
          explanation: "Sugestão sintética para revisar.",
        },
        {
          type: "possible_contradiction",
          source_answer_ids: [ANSWER_A],
          explanation: "Inválido por ter uma única fonte.",
        },
      ],
    }),
    { findings: [], state: "invalid_output" },
  );

  for (const invalid of [
    { findings: "none" },
    { findings: [], diagnosis: "automatic" },
    { findings: [{ type: "unknown", explanation: "X", source_answer_ids: [] }] },
    "untrusted",
  ]) {
    assert.deepEqual(present(invalid), {
      findings: [],
      state: "invalid_output",
    });
  }
});

test("completed output rejects sources and target questions outside this submission", () => {
  const finding = {
    type: "clarification_needed",
    explanation: "Exemplo sintético.",
    source_answer_ids: [OUTSIDER_ANSWER],
  };
  assert.equal(present({ findings: [finding] }).state, "invalid_output");
  assert.equal(
    present({
      findings: [
        {
          type: "missing_answer",
          explanation: "Exemplo sintético.",
          source_answer_ids: [],
          target_question_id: OUTSIDER_QUESTION,
        },
      ],
    }).state,
    "invalid_output",
  );
});

test("completed valid findings remain available for separate human decisions", () => {
  const findings = [
    {
      type: "possible_contradiction",
      explanation: "Duas respostas sintéticas podem exigir esclarecimento.",
      source_answer_ids: [ANSWER_A, ANSWER_B],
    },
    {
      type: "missing_answer",
      explanation: "A pergunta sintética aplicável ficou sem resposta.",
      source_answer_ids: [],
      target_question_id: MISSING_QUESTION,
    },
  ];
  assert.deepEqual(present({ findings }), {
    findings,
    state: "ready",
  });
});

test("nonterminal, failed and contradictory completion states cannot expose findings", () => {
  const valid = { findings: [{ type: "clarification_needed", explanation: "Sintético", source_answer_ids: [ANSWER_A] }] };
  for (const status of ["started", "failed", "pending", "unknown"]) {
    assert.equal(present(valid, { status }).state, "not_completed");
    assert.deepEqual(present(valid, { status }).findings, []);
  }
  assert.equal(present(valid, { completedAt: null }).state, "invalid_output");
  assert.equal(present(valid, { completedAt: "invalid" }).state, "invalid_output");
  assert.equal(present(valid, { failedAt: completedAt }).state, "invalid_output");
});

test("an answer owned by the same submission but absent from this execution's ledger is not a valid source", () => {
  const finding = (answerId: string) => ({
    type: "clarification_needed",
    source_answer_ids: [answerId],
    explanation: "Exemplo sintético de proveniência.",
  });
  const recordedOnlyA = new Set([ANSWER_A]);
  assert.equal(
    present({ findings: [finding(ANSWER_A)] }, { allowedSourceAnswerIds: recordedOnlyA }).state,
    "ready",
  );
  assert.equal(
    present({ findings: [finding(ANSWER_B)] }, { allowedSourceAnswerIds: recordedOnlyA }).state,
    "invalid_output",
  );
  assert.equal(
    present({ findings: [finding(ANSWER_A)] }, { allowedSourceAnswerIds: new Set() }).state,
    "invalid_output",
  );
  assert.equal(present({ findings: [] }, { allowedSourceAnswerIds: new Set() }).state, "ready");
});

test("answered, not-applicable or non-minimized missing targets cannot become human actions", () => {
  const claimedMissing = (questionId: string) => ({
    findings: [{
      type: "missing_answer",
      source_answer_ids: [],
      target_question_id: questionId,
      explanation: "Ausência alegada em teste sintético.",
    }],
  });
  assert.equal(present(claimedMissing(MISSING_QUESTION)).state, "ready");
  assert.equal(
    present(claimedMissing(MISSING_QUESTION), {
      allowedMissingTargetQuestionIds: new Set(),
    }).state,
    "invalid_output",
    "a question no longer confirmed as missing must be rejected",
  );
  assert.equal(
    present(claimedMissing(OUTSIDER_QUESTION), {
      allowedMissingTargetQuestionIds,
    }).state,
    "invalid_output",
  );
  assert.equal(
    present(claimedMissing(MISSING_QUESTION), {
      allowedMissingTargetQuestionIds: null,
    }).state,
    "invalid_output",
    "invalid contextual integrity must block decisions, not invent an allowlist",
  );
  assert.equal(
    present({ findings: [] }, { allowedMissingTargetQuestionIds: null }).state,
    "invalid_output",
  );
});
