import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/conteudos/actions.ts", import.meta.url), "utf8");

test("content display order uses strict integer validation", () => {
  assert.match(source, /Number\.isSafeInteger\(value\)/);
  assert.doesNotMatch(source, /Number\.parseInt\(raw, 10\)/);
  assert.match(source, /normalized\) \? Number\(normalized\) : Number\.NaN/);
});

test("invalid title or order is rejected before creating the base content record", () => {
  const start = source.indexOf("export async function createEducationalContentDraftAction");
  const action = source.slice(start);
  assert.ok(action.indexOf("const title = readTitle(formData)") < action.indexOf("await createAccessibleEducationalContent()"));
  assert.ok(action.indexOf("const displayOrder = readDisplayOrder(formData)") < action.indexOf("await createAccessibleEducationalContent()"));
});
