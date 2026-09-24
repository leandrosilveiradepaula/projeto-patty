import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

type ManifestItem = {
  source_code: string;
  disposition: string;
  candidate_section: string | null;
  composite_question: boolean;
  conditional_candidate: boolean;
  final_input_type: string;
};

type Manifest = {
  status: string;
  canonical_form_key: string;
  rules: {
    measurements_live_outside_anamnesis: string[];
    do_not_publish_until: string[];
  };
  items: ManifestItem[];
};

function loadManifest(): Manifest {
  const path = join(
    process.cwd(),
    "docs",
    "anamnesis_canonical_v1_candidate.json",
  );

  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

test("canonical anamnesis candidate preserves the full historical inventory", () => {
  const manifest = loadManifest();

  assert.equal(manifest.canonical_form_key, "client-anamnesis");
  assert.equal(manifest.status, "product_approved_publishable");
  assert.equal(manifest.items.length, 47);

  const expectedCodes = Array.from(
    { length: 47 },
    (_, index) => `ANAM-${String(index).padStart(3, "0")}`,
  );

  assert.deepEqual(
    manifest.items.map((item) => item.source_code),
    expectedCodes,
  );
});

test("body measurements remain outside the canonical anamnesis", () => {
  const manifest = loadManifest();
  const measurementCodes = ["ANAM-005", "ANAM-006", "ANAM-007", "ANAM-008"];

  assert.deepEqual(
    manifest.rules.measurements_live_outside_anamnesis,
    measurementCodes,
  );

  for (const code of measurementCodes) {
    const item = manifest.items.find((candidate) => candidate.source_code === code);
    assert.ok(item, `Missing historical item ${code}`);
    assert.equal(item.disposition, "exclude_to_assessment");
    assert.equal(item.candidate_section, null);
  }
});

test("product-approved manifest remains blocked only by explicit remaining gates", () => {
  const manifest = loadManifest();

  assert.deepEqual(manifest.rules.do_not_publish_until, []);
  assert.ok(
    manifest.items
      .filter((item) => item.disposition === "include_v1")
      .every((item) => item.final_input_type === "resolved_in_field_map"),
  );

  const files = manifest.items.find((item) => item.source_code === "ANAM-044");
  const consent = manifest.items.find((item) => item.source_code === "ANAM-046");

  assert.equal(files?.disposition, "files_flow_link");
  assert.equal(files?.final_input_type, "not_an_answer");
  assert.equal(consent?.disposition, "include_v1");
  assert.equal(consent?.final_input_type, "resolved_in_field_map");
});
