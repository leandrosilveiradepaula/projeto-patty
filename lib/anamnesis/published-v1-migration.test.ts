import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260924230322_publish_canonical_anamnesis_v1.sql",
);
const fieldMapPath = join(
  process.cwd(),
  "docs",
  "anamnesis_field_map_v1_candidate.json",
);

test("published canonical Anamnesis v1 matches the approved field map", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const fieldMap = JSON.parse(readFileSync(fieldMapPath, "utf8"));
  const fields = fieldMap.entries.flatMap((entry: { fields: Array<{ question_key_candidate: string }> }) =>
    entry.fields.map((field) => field.question_key_candidate),
  );

  assert.equal(fieldMap.status, "product_approved_publishable");
  assert.equal(fields.length, 51);
  assert.match(sql, /values \('client-anamnesis'\)/);
  assert.match(sql, /version_number\)\s+select id, 1/i);
  assert.match(sql, /set published_at=statement_timestamp\(\)/i);

  for (const key of fields) {
    assert.match(sql, new RegExp(`'${key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}'`));
  }
});

test("published canonical Anamnesis v1 preserves the consent checkbox contract", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /'consent_acceptance'/);
  assert.match(sql, /'single_choice'/);
  assert.match(sql, /'\["Concordo"\]'::jsonb/);
  assert.match(
    sql,
    /Concordo com o tratamento das informações fornecidas nesta Anamnese/,
  );
});
