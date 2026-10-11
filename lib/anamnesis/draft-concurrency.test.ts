import assert from "node:assert/strict";
import test from "node:test";
import {
  draftAnswerJsonbFilter,
  matchesDraftAnswerExpectation,
  parseDraftAnswerExpectation,
} from "./draft-concurrency.ts";

function expected(exists: string, value: string) {
  const form = new FormData();
  form.set("expectedAnswerExists", exists);
  form.set("expectedAnswerValue", value);
  return parseDraftAnswerExpectation(form);
}

test(" distinguishes missing, blank saved, and nonempty saved answers", () => {
  assert.deepEqual(expected("0", ""), { exists: false });
  assert.deepEqual(expected("1", ""), { exists: true, value: "" });
  assert.deepEqual(expected("1", "Sim"), { exists: true, value: "Sim" });
  assert.equal(expected("0", "Sim"), null);
  assert.equal(expected("unexpected", ""), null);
  assert.equal(parseDraftAnswerExpectation(new FormData()), null);
});

test("matches only the version the client read and never treats absence as blank", () => {
  assert.equal(matchesDraftAnswerExpectation(null, { exists: false }), true);
  assert.equal(matchesDraftAnswerExpectation({ answer_value: "" }, { exists: false }), false);
  assert.equal(matchesDraftAnswerExpectation(null, { exists: true, value: "" }), false);
  assert.equal(matchesDraftAnswerExpectation({ answer_value: "" }, { exists: true, value: "" }), true);
  assert.equal(matchesDraftAnswerExpectation({ answer_value: "Sim" }, { exists: true, value: "Não" }), false);
  assert.equal(matchesDraftAnswerExpectation({ answer_value: "Não" }, { exists: true, value: "Não" }), true);
  assert.equal(matchesDraftAnswerExpectation({ answer_value: [] }, { exists: true, value: "" }), false);
});

test("JSONB comparison encodes quotes, accents and empty values without leaking into URLs", () => {
  assert.equal(draftAnswerJsonbFilter(""), '""');
  assert.equal(draftAnswerJsonbFilter('Diz "sim"'), '"Diz \\"sim\\""');
  assert.equal(draftAnswerJsonbFilter("Não"), '"Não"');
});
