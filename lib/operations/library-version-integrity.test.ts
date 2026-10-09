import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contentActions = readFileSync(new URL("../../app/admin/conteudos/[contentId]/actions.ts", import.meta.url), "utf8");
const exerciseActions = readFileSync(new URL("../../app/admin/exercicios/[exerciseId]/actions.ts", import.meta.url), "utf8");

test("educational content version increments reject unsafe numbers", () => {
  assert.match(contentActions, /!Number\.isSafeInteger\(nextVersionNumber\) \|\| nextVersionNumber < 2/);
});

test("exercise version increments reject unsafe numbers", () => {
  assert.match(exerciseActions, /!Number\.isSafeInteger\(nextVersionNumber\) \|\| nextVersionNumber < 2/);
});

test("private asset MIME types require a complete type and subtype", () => {
  assert.match(contentActions, /test\(contentType\)/);
  assert.doesNotMatch(contentActions, /!contentType\.includes\("\/"\)/);
});

test("private storage paths reject backslashes and empty segments", () => {
  assert.match(contentActions, /storagePath\.includes\("\\\\"\)/);
  assert.match(contentActions, /storagePath\.split\("\/"\)\.some/);
});

test("asset size parsing trims surrounding whitespace but remains integer-only", () => {
  assert.match(contentActions, /test\(rawByteSize\.trim\(\)\)/);
  assert.match(contentActions, /Number\.isSafeInteger\(byteSize\)/);
});
