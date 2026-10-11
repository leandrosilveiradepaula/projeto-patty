import assert from "node:assert/strict";
import test from "node:test";
import { fingerprintWeeklyFeedbackAnswers, validWeeklyFeedbackFingerprint } from "./draft-fingerprint.ts";

test("fingerprints do not reveal responses and ignore JSON key order", () => {
  const one=fingerprintWeeklyFeedbackAnswers({nota:9, detalhes:"sensível", numeros:[0,true,null]});
  const two=fingerprintWeeklyFeedbackAnswers({numeros:[0,true,null], detalhes:"sensível", nota:9});
  assert.equal(one,two);
  assert.equal(one.length,64);
  assert.doesNotMatch(one, /sensível|detalhes/);
  assert.notEqual(one,fingerprintWeeklyFeedbackAnswers({nota:8,detalhes:"sensível",numeros:[0,true,null]}));
});
test("validates opaque markers before using a stale-form check", () => {
  assert.equal(validWeeklyFeedbackFingerprint(fingerprintWeeklyFeedbackAnswers({})), true);
  for(const marker of [null,undefined,"", "a".repeat(63), "Z".repeat(64), {},123]) {
    assert.equal(validWeeklyFeedbackFingerprint(marker),false);
  }
});
