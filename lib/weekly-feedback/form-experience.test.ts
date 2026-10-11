import assert from "node:assert/strict";
import test from "node:test";

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
