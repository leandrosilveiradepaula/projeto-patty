import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAnamnesisReviewContext } from "./anamnesis-review-context.ts";
import {
  buildOpenAiAnamnesisReviewRequest,
  mapOpenAiReviewOutputToCanonical,
} from "./openai-anamnesis-review.ts";
import {
  buildRepresentativeVolumeEvaluationContext,
  representativeVolumeSyntheticFixture,
} from "./synthetic-representative-evaluation.ts";

test("representative synthetic evaluation uses the production minimizer", () => {
  const context = buildRepresentativeVolumeEvaluationContext();

  assert.equal(representativeVolumeSyntheticFixture.answers.length, 42);
  assert.equal(context.sources.length, 38);
  assert.equal(context.allowedSourceAnswerIds.size, 38);
  assert.deepEqual(context.missingTargets, []);

  for (const key of [
    "city",
    "contact_phone",
    "contact_email",
    "consent_acceptance",
  ]) {
    assert.equal(context.sources.some((source) => source.question_key === key), false, key);
  }
});

test("financial fixture source remains opt-in only", () => {
  const withoutExplicitFinancialSource = buildAnamnesisReviewContext({
    answers: representativeVolumeSyntheticFixture.answers,
    formVersionId: representativeVolumeSyntheticFixture.formVersionId,
    questions: representativeVolumeSyntheticFixture.questions,
    submissionId: representativeVolumeSyntheticFixture.submissionId,
  });
  const context = buildRepresentativeVolumeEvaluationContext();

  assert.equal(withoutExplicitFinancialSource.sources.length, 37);
  assert.equal(
    withoutExplicitFinancialSource.sources.some(
      (source) => source.question_key === "financial_capacity_for_supplements",
    ),
    false,
  );
  assert.equal(
    context.sources.some(
      (source) => source.question_key === "financial_capacity_for_supplements",
    ),
    true,
  );
});

test("representative request stays stateless, alias-only, and deterministically validated", () => {
  const context = buildRepresentativeVolumeEvaluationContext();
  const request = buildOpenAiAnamnesisReviewRequest({
    context,
    instructions: "Synthetic offline test only.",
    model: "gpt-test",
  });

  assert.equal(request.body.store, false);
  for (const source of context.sources) {
    assert.equal(request.body.input.includes(source.source_answer_id), false);
    assert.equal(request.body.input.includes(source.question_id), false);
  }

  const mapped = mapOpenAiReviewOutputToCanonical({
    aliases: request.aliases,
    context,
    value: {
      findings: [
        {
          type: "possible_contradiction",
          source_refs: ["A1", "A2"],
          target_ref: null,
          explanation: "Achado sintético sujeito à revisão humana.",
          suggested_follow_up_question: null,
        },
      ],
    },
  });

  assert.equal(mapped.ok, true);
  assert.equal(mapped.ok && mapped.value.findings.length, 1);
  assert.deepEqual(
    mapped.ok && mapped.value.findings[0].source_answer_ids,
    context.sources.slice(0, 2).map((source) => source.source_answer_id),
  );
});

test("evaluation harness delegates representative volume to the shared minimizer", () => {
  const harness = readFileSync(
    new URL("../../scripts/eval-openai-anamnesis-review.ts", import.meta.url),
    "utf8",
  );

  assert.match(harness, /buildRepresentativeVolumeEvaluationContext/);
  assert.doesNotMatch(harness, /representativeVolume(?:Items|Sources)/);
});
