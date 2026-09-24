import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANAMNESIS_QUESTION_KEYS,
  ANAMNESIS_SOURCE_CODES,
} from "./question-keys.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const fieldMapPath = path.resolve(
  here,
  "../../docs/anamnesis_field_map_v1_candidate.json",
);

test("financial capacity keeps a stable versioned question key tied to ANAM-033", () => {
  const fieldMap = JSON.parse(fs.readFileSync(fieldMapPath, "utf8"));
  const item = fieldMap.items.find(
    (candidate: { code?: string }) =>
      candidate.code === ANAMNESIS_SOURCE_CODES.financialCapacityForSupplements,
  );

  assert.ok(item, "ANAM-033 must remain present in the v1 field map");
  assert.equal(item.fields.length, 1);
  assert.equal(
    item.fields[0].question_key_candidate,
    ANAMNESIS_QUESTION_KEYS.financialCapacityForSupplements,
  );
  assert.equal(item.fields[0].ai_default, "exclude");
});

test("sensitive informational keys remain distinct", () => {
  assert.notEqual(
    ANAMNESIS_QUESTION_KEYS.financialCapacityForSupplements,
    ANAMNESIS_QUESTION_KEYS.instagram,
  );
});
