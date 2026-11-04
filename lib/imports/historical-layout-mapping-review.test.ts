import assert from "node:assert/strict";
import test from "node:test";
import { previewHistoricalArchives } from "./historical-archive-preview.ts";
import { reviewHistoricalLayoutMapping, HISTORICAL_LAYOUT_PROPOSAL_VERSION } from "./historical-layout-mapping-review.ts";
import { syntheticPng, syntheticXlsx, syntheticZip } from "../../tests/fixtures/imports/synthetic-archives.ts";

function fixture() {
  const preview = previewHistoricalArchives([{
    bytes: syntheticZip([{ name: "NOME_PRIVADO.xlsx", bytes: syntheticXlsx() }]),
  }]);
  const archive = preview.archives[0]!;
  const entry = archive.entries[0]!;
  assert.equal(entry.status, "recognized");
  assert.ok(entry.spreadsheet);
  return {
    preview,
    proposal: {
      version: HISTORICAL_LAYOUT_PROPOSAL_VERSION,
      source: {
        archive_sha256: archive.sha256,
        entry_id: entry.entry_id,
        entry_sha256: entry.sha256!,
        column_signature_sha256: entry.spreadsheet!.column_signature_sha256,
      },
      revision: { number: 1, supersedes_sha256: null },
      columns: [
        { sheet_index: 0, column_index: 1, destination_key: "field_alpha", value_kind: "date", date_format: "DD/MM/YYYY" },
        { sheet_index: 0, column_index: 2, destination_key: "field_beta", value_kind: "decimal", unit: "kg" },
      ],
    },
  };
}

test("a fully attributed proposal remains pending human professional review without values or filenames", () => {
  const { preview, proposal } = fixture();
  const result = reviewHistoricalLayoutMapping(preview, proposal);
  assert.equal(result.mode, "dry_run");
  assert.equal(result.persistence, "none");
  assert.equal(result.state, "pending_professional_review");
  assert.equal(result.proposed_column_count, 2);
  assert.match(result.proposal_sha256!, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.errors, []);
  assert.doesNotMatch(JSON.stringify(result), /NOME_PRIVADO|kg|field_alpha|field_beta|\.xlsx/);
  const reversed = { ...proposal, columns: [...proposal.columns].reverse() };
  assert.deepEqual(result, reviewHistoricalLayoutMapping(preview, reversed));
});

test("revision chains require explicit predecessor SHA and change the checksum", () => {
  const { preview, proposal } = fixture();
  const first = reviewHistoricalLayoutMapping(preview, proposal);
  const second = reviewHistoricalLayoutMapping(preview, {
    ...proposal,
    revision: { number: 2, supersedes_sha256: first.proposal_sha256! },
  });
  assert.equal(second.state, "pending_professional_review");
  assert.notEqual(first.proposal_sha256, second.proposal_sha256);
  for (const revision of [
    { number: 0, supersedes_sha256: null },
    { number: 1, supersedes_sha256: first.proposal_sha256 },
    { number: 2, supersedes_sha256: null },
    { number: 2, supersedes_sha256: "not-a-hash" },
  ]) {
    const result = reviewHistoricalLayoutMapping(preview, { ...proposal, revision });
    assert.equal(result.state, "blocked");
    assert.ok(result.errors.includes("invalid_revision"));
    assert.equal(result.proposal_sha256, undefined);
  }
});

test("source identity is bound to original ZIP, XLSX SHA and layout fingerprint", () => {
  const { preview, proposal } = fixture();
  for (const source of [
    { ...proposal.source, archive_sha256: "0".repeat(64) },
    { ...proposal.source, entry_sha256: "0".repeat(64) },
    { ...proposal.source, column_signature_sha256: "0".repeat(64) },
    { ...proposal.source, entry_id: "archive_999_entry_001" },
  ]) {
    const result = reviewHistoricalLayoutMapping(preview, { ...proposal, source });
    assert.equal(result.state, "blocked");
    assert.equal(result.proposal_sha256, undefined);
    assert.ok(result.errors.some((error) => ["source_not_found", "source_hash_mismatch", "layout_hash_mismatch"].includes(error)));
  }
});

test("fails closed on duplicate ZIP, repeated entry identity, rejected source and unsupported preview", () => {
  const { preview, proposal } = fixture();
  const zipped = syntheticZip([{ name: "NOME_PRIVADO.xlsx", bytes: syntheticXlsx() }]);
  const duplicated = previewHistoricalArchives([{ bytes: zipped }, { bytes: zipped }]);
  assert.equal(reviewHistoricalLayoutMapping(duplicated, proposal).state, "blocked");
  const overwritten = { ...preview, archives: [...preview.archives, preview.archives[0]!] };
  assert.equal(reviewHistoricalLayoutMapping(overwritten, proposal).state, "blocked");
  const previewWrongVersion = { ...preview, version: "migr-hist-02" };
  assert.deepEqual(reviewHistoricalLayoutMapping(previewWrongVersion, proposal).errors, ["invalid_preview"]);
  const badArchive = previewHistoricalArchives([{ bytes: syntheticZip([{ name: "photo.png", bytes: syntheticPng }]) }]);
  const wrongProposal = {
    ...proposal,
    source: {
      ...proposal.source,
      archive_sha256: badArchive.archives[0]!.sha256,
      entry_id: badArchive.archives[0]!.entries[0]!.entry_id,
      entry_sha256: badArchive.archives[0]!.entries[0]!.sha256!,
    },
  };
  assert.ok(reviewHistoricalLayoutMapping(badArchive, wrongProposal).errors.includes("source_rejected"));
});

test("rejects ambiguous formats, reused coordinates, target collisions and out-of-range selectors", () => {
  const { preview, proposal } = fixture();
  const columns = proposal.columns;
  const alterations = [
    [{ ...columns[0], date_format: undefined }],
    [{ ...columns[1], unit: undefined }],
    [{ ...columns[0], sheet_index: 1 }],
    [{ ...columns[0], column_index: 16385 }],
    [{ ...columns[0], sheet_index: 0 }, { ...columns[1], column_index: 1 }],
    [{ ...columns[0] }, { ...columns[1], destination_key: "field_alpha" }],
  ];
  for (const altered of alterations) {
    const result = reviewHistoricalLayoutMapping(preview, { ...proposal, columns: altered });
    assert.equal(result.state, "blocked", JSON.stringify(result.errors));
  }
});

test("rejects arbitrary extra metadata and never echoes hostile content", () => {
  const { preview, proposal } = fixture();
  const inject = "CLIENTE_ULTRA_PRIVADA";
  const altered = { ...proposal, client_email: inject };
  const result = reviewHistoricalLayoutMapping(preview, altered);
  assert.equal(result.state, "blocked");
  assert.deepEqual(result.errors, ["invalid_proposal"]);
  assert.doesNotMatch(JSON.stringify(result), /CLIENTE_ULTRA_PRIVADA/);
  assert.deepEqual(reviewHistoricalLayoutMapping(preview, "NOME PRIVADO").errors, ["invalid_proposal"]);
  assert.deepEqual(reviewHistoricalLayoutMapping({}, proposal).errors, ["invalid_preview"]);
});
