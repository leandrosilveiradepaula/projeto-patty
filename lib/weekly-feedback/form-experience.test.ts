import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { weeklyFeedbackAnswerFieldId } from "./field-ids.ts";

import {
  buildWeeklyFeedbackAnswers,
  firstInvalidWeeklyFeedbackField,
  getWeeklyFeedbackFieldError,
  mayUseExplicitNotApplicable,
  summarizeWeeklyFeedbackRequiredProgress,
  validateWeeklyFeedbackAnswers,
  WeeklyFeedbackFieldValidationError,
  type WeeklyFeedbackQuestion,
} from "./definition.ts";

const qs: WeeklyFeedbackQuestion[] = [
  { key: "treinos", label: "Treinos", inputType: "integer", required: true, allowsNotApplicable: false },
  { key: "nota", label: "Nota", inputType: "rating_0_10", required: true, allowsNotApplicable: false },
  { key: "texto", label: "Observações", inputType: "text", required: false, allowsNotApplicable: true },
];

test("progress distinguishes zero as answered, whitespace as missing and optional fields", () => {
  assert.deepEqual(
    summarizeWeeklyFeedbackRequiredProgress(qs, { treinos: "0", nota: " ", texto: "  presente  " }),
    { completed: 2, total: 3, required: 2, requiredCompleted: 1, firstMissingRequired: "nota" },
  );
});

test("field validation provides specific errors without echoing sensitive values", () => {
  assert.equal(getWeeklyFeedbackFieldError(qs[0], "", false), null);
  assert.match(getWeeklyFeedbackFieldError(qs[0], "", true) ?? "", /Preencha/);
  assert.match(getWeeklyFeedbackFieldError(qs[0], "1e2", false) ?? "", /inteiro/);
  assert.match(getWeeklyFeedbackFieldError(qs[1], "11", true) ?? "", /0 e 10/);
  assert.match(getWeeklyFeedbackFieldError(qs[2], "x".repeat(4001), false) ?? "", /4.000/);
  assert.equal(getWeeklyFeedbackFieldError(qs[1], "0", true), null);
});
test("first invalid required field is the real first error in definition order", () => {
  assert.equal(firstInvalidWeeklyFeedbackField(qs, { treinos: "3", nota: "11" }, true), "nota");
  assert.equal(firstInvalidWeeklyFeedbackField(qs, { treinos: "", nota: "10" }, true), "treinos");
  assert.equal(firstInvalidWeeklyFeedbackField(qs, { treinos: "", nota: "10" }, false), null);
});
test("explicit not-applicable option only assists compatible text questions", () => {
  assert.equal(mayUseExplicitNotApplicable(qs[2]), true);
  assert.equal(mayUseExplicitNotApplicable({ ...qs[0], allowsNotApplicable: true }), false);
  assert.equal(mayUseExplicitNotApplicable({ ...qs[2], allowsNotApplicable: false }), false);
});
test("rejects ambiguous duplicated values including valid first plus malicious second", () => {
  const form = new FormData();
  form.append("treinos", "3");
  form.append("treinos", "9");
  assert.throws(() => buildWeeklyFeedbackAnswers(form, {questions:qs,schemaVersion:1,sourceReference:null}), (error:unknown) =>
    error instanceof WeeklyFeedbackFieldValidationError && error.questionKey === "treinos");
});
test("missing required final field identifies its key without returning response text", () => {
  const answers = { treinos: 0 };
  assert.throws(() => validateWeeklyFeedbackAnswers(answers,{questions:qs,schemaVersion:1,sourceReference:null}), (error:unknown) =>
    error instanceof WeeklyFeedbackFieldValidationError && error.questionKey === "nota");
});
test("does not substitute a canned not-applicable answer for an empty client response", () => {
  const form=new FormData();
  form.set("texto", "");
  assert.deepEqual(buildWeeklyFeedbackAnswers(form, {questions:qs,schemaVersion:1,sourceReference:null}), {});
});

test("multiple pending weeks keep all answer labels, errors and focus targets distinct", () => {
  const weekA = "11111111-1111-4111-8111-111111111111";
  const weekB = "22222222-2222-4222-8222-222222222222";
  const a = weeklyFeedbackAnswerFieldId(weekA, "treinos");
  const b = weeklyFeedbackAnswerFieldId(weekB, "treinos");
  assert.notEqual(a, b);
  assert.equal(weeklyFeedbackAnswerFieldId(weekA, "treinos"), a);
  assert.notEqual(weeklyFeedbackAnswerFieldId(weekA, "nota"), a);
  assert.ok(!a.includes("resposta da cliente"));
  assert.equal(weeklyFeedbackAnswerFieldId("a-b", "c") === weeklyFeedbackAnswerFieldId("a", "b-c"), false);
  const form = readFileSync(new URL("../../app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx", import.meta.url), "utf8");
  assert.match(form, /const fieldId = weeklyFeedbackAnswerFieldId\(feedbackId, question\.key\)/);
  assert.match(form, /weeklyFeedbackAnswerFieldId\(feedbackId, invalid\)/);
  assert.match(form, /weeklyFeedbackAnswerFieldId\(feedbackId, firstMissingRequired\)/);
  assert.match(form, /weeklyFeedbackAnswerFieldId\(feedbackId, state\.questionKey\)/);
  assert.match(form, /aria-describedby=\{showError \? fieldId \+ "-error"/);
  assert.doesNotMatch(form, /document\.getElementById\("weekly-feedback-answer-" \+/);
  const e2e = readFileSync(new URL("../../e2e/j2-weekly-feedback-lifecycle.spec.mjs", import.meta.url), "utf8");
  assert.match(e2e, /locator\("#feedback-pendente-" \+ feedbackId \+ " form"\)/);
  assert.match(e2e, /answerInput\(question\.key\)/);
  assert.doesNotMatch(e2e, /#weekly-feedback-answer-q|\#weekly-feedback-answer-" \+/);
});
