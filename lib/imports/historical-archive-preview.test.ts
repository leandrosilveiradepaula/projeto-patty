import assert from "node:assert/strict";
import test from "node:test";
import { previewHistoricalArchives } from "./historical-archive-preview.ts";
import { syntheticJpeg, syntheticPng, syntheticXlsx, syntheticZip, text } from "../../tests/fixtures/imports/synthetic-archives.ts";

test("dry-run preview recognizes synthetic XLSX and images, normalizes no PII-bearing names, and is deterministic", () => {
  const xlsx = syntheticXlsx();
  const archive = syntheticZip([
    { name: "private-name.xlsx", bytes: xlsx, compression: "deflate" },
    { name: "private-photo-a.jpg", bytes: syntheticJpeg },
    { name: "private-photo-b.jpg", bytes: syntheticJpeg },
    { name: "private-photo.png", bytes: syntheticPng },
  ]);
  const first = previewHistoricalArchives([{ bytes: archive }]);
  const second = previewHistoricalArchives([{ bytes: archive }]);

  assert.deepEqual(first, second);
  assert.equal(first.mode, "dry_run");
  assert.equal(first.persistence, "none");
  assert.equal(first.client_status, "human_decision_required");
  assert.equal(first.summary.xlsx_count, 1);
  assert.equal(first.summary.image_count, 3);
  assert.equal(first.archives[0]!.entries[0]!.spreadsheet?.worksheet_count, 1);
  assert.equal(first.archives[0]!.entries[0]!.spreadsheet?.brazilian_number_candidates, 1);
  assert.ok(first.archives[0]!.entries[0]!.review_reasons.includes("ambiguous_date_candidate"));
  assert.equal(first.duplicate_binary_groups.length, 1);
  assert.equal(first.duplicate_binary_groups[0]!.entry_ids.length, 2);
  assert.doesNotMatch(JSON.stringify(first), /private-name|private-photo/);
});

test("a bad archive and a corrupt XLSX are isolated without aborting a healthy synthetic archive", () => {
  const healthy = syntheticZip([{ name: "safe.png", bytes: syntheticPng }]);
  const corruptXlsx = syntheticZip([{ name: "misleading.xlsx", bytes: text("not a workbook") }]);
  const result = previewHistoricalArchives([{ bytes: new Uint8Array([1, 2, 3]) }, { bytes: corruptXlsx }, { bytes: healthy }]);

  assert.equal(result.archives[0]!.status, "rejected");
  assert.deepEqual(result.archives[0]!.errors, ["archive_invalid"]);
  assert.equal(result.archives[1]!.entries[0]!.kind, "unrecognized");
  assert.ok(result.archives[1]!.entries[0]!.errors.includes("entry_format_disguised"));
  assert.equal(result.archives[2]!.entries[0]!.kind, "png");
});

test("unsafe ZIP members are individually rejected: traversal, encrypted member, symlink and expansion limit", () => {
  const archive = syntheticZip([
    { name: "../outside.png", bytes: syntheticPng },
    { name: "encrypted.png", bytes: syntheticPng, encrypted: true },
    { name: "link.png", bytes: syntheticPng, symlink: true },
    { name: "large.png", bytes: new Uint8Array(64), compression: "deflate" },
    { name: "healthy.png", bytes: syntheticPng },
  ]);
  const result = previewHistoricalArchives([{ bytes: archive }], { maxUncompressedBytesPerEntry: 32 });
  const entries = result.archives[0]!.entries;
  assert.deepEqual(entries.map((entry) => entry.errors[0]), ["entry_path_unsafe", "entry_encrypted", "entry_symlink", "archive_limit_exceeded", undefined]);
  assert.equal(entries[4]!.kind, "png");
});

test("format disguise and archive count limit are reported without inspecting omitted archives", () => {
  const disguised = syntheticZip([{ name: "image.png", bytes: syntheticXlsx() }]);
  const healthy = syntheticZip([{ name: "photo.png", bytes: syntheticPng }]);
  const result = previewHistoricalArchives([{ bytes: disguised }, { bytes: healthy }], { maxArchives: 1 });
  assert.equal(result.archives.length, 2);
  assert.equal(result.archives[0]!.entries[0]!.kind, "xlsx");
  assert.ok(result.archives[0]!.entries[0]!.errors.includes("entry_format_disguised"));
  assert.deepEqual(result.archives[1]!.errors, ["archive_limit_exceeded"]);
});
