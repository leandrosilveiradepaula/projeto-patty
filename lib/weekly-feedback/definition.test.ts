import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWeeklyFeedbackAnswers,
  parseWeeklyFeedbackWholeNumber,
  parseWeeklyFeedbackDefinition,
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

test("definition rejects missing questions and invalid schema versions", () => {
  const parse = (value: unknown) => parseWeeklyFeedbackDefinition(value as never);
  assert.equal(parse({ schema_version: 1, questions: [] }), null);
  for (const schema_version of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parse({ schema_version, questions: [{ key: "treinos", label: "Treinos", input_type: "integer", required: true }] }), null);
  }
});

test("definition rejects duplicate and unsafe question keys", () => {
  const parse = (questions: unknown[]) => parseWeeklyFeedbackDefinition({ schema_version: 1, questions } as never);
  const q = (key: string) => ({ key, label: "Treinos", input_type: "integer", required: true });
  assert.equal(parse([q("treinos"), q("treinos")]), null);
  for (const key of ["", " treinos", "treinos ", "__proto__", "constructor", "prototype", "x".repeat(121)]) {
    assert.equal(parse([q(key)]), null, key);
  }
});

test("definition rejects blank or oversized labels", () => {
  const parse = (label: string) => parseWeeklyFeedbackDefinition({ schema_version: 1, questions: [{ key: "treinos", label, input_type: "integer", required: true }] } as never);
  assert.equal(parse(" "), null);
  assert.equal(parse("x".repeat(501)), null);
});

test("definition still accepts existing configured question types", () => {
  const parsed = parseWeeklyFeedbackDefinition({ schema_version: 1, questions: [
    { key: "treinos", label: "Treinos", input_type: "integer", required: true },
    { key: "nota", label: "Nota", input_type: "rating_0_10", required: false },
    { key: "comentario", label: "Comentário", input_type: "text", required: false },
  ] } as never);
  assert.equal(parsed?.questions.length, 3);
});

test("feedback rejects file-valued answers rather than silently omitting them", () => {
  const form = new FormData();
  form.set("treinos", new File(["invalid"], "invalid.txt"));
  assert.throws(() => buildWeeklyFeedbackAnswers(form, definition), /Resposta inválida/);
});
