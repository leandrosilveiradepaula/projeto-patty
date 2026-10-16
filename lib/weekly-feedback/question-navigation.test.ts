import assert from "node:assert/strict";
import test from "node:test";
import {
  weeklyFeedbackQuestionCompletion,
  weeklyFeedbackQuestionNavigationLabel,
} from "./question-navigation.ts";
import type { WeeklyFeedbackQuestion } from "./definition.ts";

const requiredCount: WeeklyFeedbackQuestion = {
  key: "q01", label: "Quantos treinos?", required: true,
  allowsNotApplicable: false, inputType: "integer",
};
const optionalText: WeeklyFeedbackQuestion = {
  key: "q18", label: "Maior dificuldade relatada", required: false,
  allowsNotApplicable: false, inputType: "text",
};

test("navigation classifies only completion, never adherence or clinical condition", () => {
  assert.equal(weeklyFeedbackQuestionCompletion(requiredCount, ""), "required-missing");
  assert.equal(weeklyFeedbackQuestionCompletion(requiredCount, "0"), "answered");
  assert.equal(weeklyFeedbackQuestionCompletion(requiredCount, "2.5"), "invalid");
  assert.equal(weeklyFeedbackQuestionCompletion(optionalText, "   "), "optional-empty");
  assert.equal(weeklyFeedbackQuestionCompletion(optionalText, "  descrição  "), "answered");
  assert.equal(weeklyFeedbackQuestionCompletion(optionalText, "Não se aplica"), "answered");
});

test("navigation option is stable, bounded and never echoes sensitive response content", () => {
  const secret = "Resposta pessoal sintética para teste";
  const label = weeklyFeedbackQuestionNavigationLabel(optionalText, 17, secret);
  assert.match(label, /^Pergunta 18 · Preenchida · Maior dificuldade relatada$/);
  assert.equal(label.includes(secret), false);
  const long = weeklyFeedbackQuestionNavigationLabel({ ...requiredCount, label: "Longa ".repeat(90) }, 0, "3");
  assert.ok(long.length < 130);
  assert.ok(long.endsWith("…"));
  assert.equal(weeklyFeedbackQuestionNavigationLabel(requiredCount, 0, "-1").includes("-1"), false);
});

test("two feedback forms have independent question navigation targets", async () => {
  const { weeklyFeedbackAnswerFieldId, weeklyFeedbackQuestionNavigationId } = await import("./field-ids.ts");
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  assert.notEqual(weeklyFeedbackQuestionNavigationId(a), weeklyFeedbackQuestionNavigationId(b));
  assert.notEqual(weeklyFeedbackQuestionNavigationId(a), weeklyFeedbackAnswerFieldId(a, "q01"));
  assert.equal(weeklyFeedbackQuestionNavigationId(a), weeklyFeedbackQuestionNavigationId(a));
});
