import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type Applicability = {
  source_field_key: string;
  operator: string;
  expected_answer: unknown;
};

type CandidateField = {
  question_key_candidate: string;
  answer_type_candidate: string;
  required_when_applicable: boolean;
  options_candidate: unknown[] | null;
  applicability_candidate: Applicability | null;
  product_status?: string;
};

type Entry = {
  code: string;
  disposition: string;
  fields: CandidateField[];
};

type FieldMap = {
  status: string;
  canonical_form_key: string;
  counts: {
    source_entries: number;
    candidate_answer_fields: number;
    conditional_candidate_fields: number;
    excluded_to_assessment: number;
  };
  entries: Entry[];
};

function loadFieldMap(): FieldMap {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "docs", "anamnesis_field_map_v1_candidate.json"),
      "utf8",
    ),
  ) as FieldMap;
}

test("field map covers the full historical inventory exactly once", () => {
  const map = loadFieldMap();

  assert.equal(map.status, "product_approved_publishable");
  assert.equal(map.canonical_form_key, "client-anamnesis");
  assert.equal(map.entries.length, 47);
  assert.equal(map.counts.source_entries, 47);

  const expectedCodes = Array.from(
    { length: 47 },
    (_, index) => `ANAM-${String(index).padStart(3, "0")}`,
  );

  assert.deepEqual(
    map.entries.map((entry) => entry.code),
    expectedCodes,
  );
});

test("field map preserves confirmed measurement separation", () => {
  const map = loadFieldMap();

  for (const code of ["ANAM-005", "ANAM-006", "ANAM-007", "ANAM-008"]) {
    const entry = map.entries.find((candidate) => candidate.code === code);
    assert.ok(entry, `Missing ${code}`);
    assert.equal(entry.disposition, "exclude_to_assessment");
    assert.equal(entry.fields.length, 0);
  }

  assert.equal(map.counts.excluded_to_assessment, 4);
});

test("candidate field keys are unique and all answer fields are required when applicable", () => {
  const map = loadFieldMap();
  const fields = map.entries.flatMap((entry) => entry.fields);
  const keys = fields.map((field) => field.question_key_candidate);

  assert.equal(fields.length, 51);
  assert.equal(map.counts.candidate_answer_fields, 51);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(fields.every((field) => field.required_when_applicable));
});

test("all conditional candidates reference another candidate field and use exact equality", () => {
  const map = loadFieldMap();
  const fields = map.entries.flatMap((entry) => entry.fields);
  const keys = new Set(fields.map((field) => field.question_key_candidate));
  const conditionalFields = fields.filter(
    (field) => field.applicability_candidate !== null,
  );

  assert.equal(conditionalFields.length, 10);
  assert.equal(map.counts.conditional_candidate_fields, 10);

  for (const field of conditionalFields) {
    const rule = field.applicability_candidate;
    assert.ok(rule);
    assert.ok(keys.has(rule.source_field_key));
    assert.notEqual(rule.source_field_key, field.question_key_candidate);
    assert.equal(rule.operator, "json_equals");
    assert.equal(rule.expected_answer, "Sim");
  }
});

test("single-choice candidates always define non-empty options", () => {
  const map = loadFieldMap();
  const singleChoiceFields = map.entries
    .flatMap((entry) => entry.fields)
    .filter((field) => field.answer_type_candidate === "single_choice");

  assert.ok(singleChoiceFields.length > 0);

  for (const field of singleChoiceFields) {
    assert.ok(Array.isArray(field.options_candidate));
    assert.ok((field.options_candidate?.length ?? 0) >= 2);
  }
});

test("all v1 fields are product-approved while files remain integrated outside answers", () => {
  const map = loadFieldMap();
  const files = map.entries.find((entry) => entry.code === "ANAM-044");
  const consent = map.entries.find((entry) => entry.code === "ANAM-046");
  const nonLegalFields = map.entries
    .filter((entry) => entry.code !== "ANAM-046")
    .flatMap((entry) => entry.fields);

  assert.equal(files?.disposition, "files_flow_link");
  assert.equal(files?.fields.length, 0);
  assert.equal(consent?.disposition, "include_candidate");
  assert.ok(nonLegalFields.every((field) => field.product_status === "approved_v1"));
  assert.deepEqual(consent?.fields[0]?.options_candidate, ["Concordo"]);
  assert.equal(consent?.fields[0]?.ui_control_candidate, "consent_checkbox");
  assert.ok(consent?.fields.every((field) => field.product_status === "approved_v1"));
});
