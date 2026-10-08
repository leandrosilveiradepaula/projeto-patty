import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWeeklyFeedbackAnswers,
  parseWeeklyFeedbackWholeNumber,
  validateWeeklyFeedbackAnswers,
  type WeeklyFeedbackDefinition,
} from "./definition.ts";

const definition: WeeklyFeedbackDefinition = {
  questions: [
    { key: "treinos", label: "Quantos treinos?", required: true, inputType: "integer", allowsNotApplicable: false },
    { key: "nota", label: "Nota", required: true, inputType: "rating_0_10", allowsNotApplicable: false },
    { key: "comentario", label: "Comentário", required: false, inputType: "text", allowsNotApplicable: false },
  ],
  schemaVersion: 1,
  sourceReference: null,
};

function feedbackForm(values: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

test("whole-number parser accepts valid zero and nonnegative counts", () => {
  assert.equal(parseWeeklyFeedbackWholeNumber("0"), 0);
  assert.equal(parseWeeklyFeedbackWholeNumber(" 05 "), 5);
  assert.equal(parseWeeklyFeedbackWholeNumber("21"), 21);
  assert.equal(parseWeeklyFeedbackWholeNumber(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
});

test("whole-number parser rejects truncation, notation, and unsafe precision", () => {
  for (const input of ["2,5", "2.5", "3abc", "1e2", "-1", "+3", "", " ", "0x10", "Infinity", "9007199254740992"]) {
    assert.equal(parseWeeklyFeedbackWholeNumber(input), null, input);
  }
});

test("draft and submission read valid numbers without rewriting them", () => {
  const answers = buildWeeklyFeedbackAnswers(
    feedbackForm({ treinos: "03", nota: "0", comentario: "  Semana difícil  " }),
    definition,
  );
  assert.deepEqual(answers, { treinos: 3, nota: 0, comentario: "Semana difícil" });
  assert.doesNotThrow(() => validateWeeklyFeedbackAnswers(answers, definition));
});

test("numeric errors fail closed even for partial draft saves", () => {
  for (const input of ["3treinos", "2,5", "1e2", "9007199254740992"]) {
    assert.throws(() => buildWeeklyFeedbackAnswers(feedbackForm({ treinos: input }), definition), /Resposta inválida/);
  }
});

test("rating remains within 0 through 10 without automatic score inference", () => {
  assert.equal(buildWeeklyFeedbackAnswers(feedbackForm({ nota: "10" }), definition).nota, 10);
  assert.throws(() => buildWeeklyFeedbackAnswers(feedbackForm({ nota: "11" }), definition), /entre 0 e 10/);
  assert.throws(() => buildWeeklyFeedbackAnswers(feedbackForm({ nota: "9.5" }), definition), /Resposta inválida/);
});
