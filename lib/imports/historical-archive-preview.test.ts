import assert from "node:assert/strict";
import test from "node:test";
import { previewHistoricalArchives } from "./historical-archive-preview.ts";
import { firstSignatureOffset, patchLe16, patchLe32, syntheticJpeg, syntheticPng, syntheticXlsx, syntheticZip, text } from "../../tests/fixtures/imports/synthetic-archives.ts";

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
  assert.equal(result.archives[0]!.entries[0]!.status, "rejected");
  assert.ok(result.archives[0]!.entries[0]!.errors.includes("entry_format_disguised"));
  assert.deepEqual(result.archives[1]!.errors, ["archive_limit_exceeded"]);
});

test("rejects a CRC mismatch and local-vs-central-header mismatch before recognizing content", () => {
  const original = syntheticZip([{ name: "safe.png", bytes: syntheticPng }]);
  const local = firstSignatureOffset(original, 0x04034b50);
  const central = firstSignatureOffset(original, 0x02014b50);
  const crcMismatch = patchLe32(patchLe32(original, local + 14, 0x12345678), central + 16, 0x12345678);
  const headerMismatch = patchLe32(original, local + 18, 1);

  const crcResult = previewHistoricalArchives([{ bytes: crcMismatch }]);
  const headerResult = previewHistoricalArchives([{ bytes: headerMismatch }]);
  assert.deepEqual(crcResult.archives[0]!.entries[0]!.errors, ["entry_corrupt"]);
  assert.deepEqual(headerResult.archives[0]!.errors, ["archive_invalid"]);
});

test("enforces output budgets during deflate, including an XLSX nested archive with a forged declared size", () => {
  const actualExpansion = syntheticZip([{ name: "expanded.bin", bytes: new Uint8Array(2_048), compression: "deflate" }]);
  const local = firstSignatureOffset(actualExpansion, 0x04034b50);
  const central = firstSignatureOffset(actualExpansion, 0x02014b50);
  const forged = patchLe32(patchLe32(actualExpansion, local + 22, 1), central + 24, 1);
  const outer = syntheticZip([{ name: "inner.xlsx", bytes: forged, compression: "deflate" }]);

  const externalResult = previewHistoricalArchives([{ bytes: forged }], { maxUncompressedBytesPerEntry: 32, maxTotalUncompressedBytes: 32 });
  const nestedResult = previewHistoricalArchives([{ bytes: outer }], { maxUncompressedBytesPerEntry: 1_024, maxTotalUncompressedBytes: 1_024 });
  assert.deepEqual(externalResult.archives[0]!.entries[0]!.errors, ["entry_corrupt"]);
  assert.equal(nestedResult.archives[0]!.entries[0]!.status, "rejected");
  assert.ok(nestedResult.archives[0]!.entries[0]!.errors.includes("entry_format_disguised"));
});

test("rejects unsupported ZIP64 and multi-disk containers", () => {
  const original = syntheticZip([{ name: "safe.png", bytes: syntheticPng }]);
  const eocd = firstSignatureOffset(original, 0x06054b50);
  const multiDisk = patchLe16(original, eocd + 4, 1);
  const zip64 = patchLe16(original, eocd + 10, 0xffff);
  assert.deepEqual(previewHistoricalArchives([{ bytes: multiDisk }]).archives[0]!.errors, ["archive_unsupported_format"]);
  assert.deepEqual(previewHistoricalArchives([{ bytes: zip64 }]).archives[0]!.errors, ["archive_unsupported_format"]);
});

test("rejects unsupported data-descriptor ZIP flags before extracting bytes", () => {
  const original = syntheticZip([{ name: "safe.png", bytes: syntheticPng }]);
  const local = firstSignatureOffset(original, 0x04034b50);
  const central = firstSignatureOffset(original, 0x02014b50);
  const descriptorFlag = patchLe16(patchLe16(original, local + 6, 0x0008), central + 8, 0x0008);
  assert.deepEqual(previewHistoricalArchives([{ bytes: descriptorFlag }]).archives[0]!.entries[0]!.errors, ["entry_unsupported_format"]);
});

test("fails closed on invalid or protection-expanding configured limits", () => {
  const archive = syntheticZip([{ name: "safe.png", bytes: syntheticPng }]);
  for (const limits of [
    { maxUncompressedBytesPerEntry: Infinity },
    { maxTotalUncompressedBytes: Infinity },
    { maxArchives: -1 },
    { maxEntriesPerArchive: Number.NaN },
    { maxUncompressedBytesPerEntry: 20 * 1024 * 1024 + 1 },
  ]) {
    assert.deepEqual(previewHistoricalArchives([{ bytes: archive }], limits).archives[0]!.errors, ["invalid_limits"]);
  }
});

test("rejects both directions of declared-format mismatch", () => {
  const archive = syntheticZip([
    { name: "declared-image.png", bytes: syntheticXlsx() },
    { name: "declared-sheet.xlsx", bytes: syntheticPng },
  ]);
  const entries = previewHistoricalArchives([{ bytes: archive }]).archives[0]!.entries;
  assert.deepEqual(entries.map((entry) => entry.status), ["rejected", "rejected"]);
  assert.ok(entries.every((entry) => entry.errors.includes("entry_format_disguised")));
});
