import assert from "node:assert/strict";
import test from "node:test";
import { inspectEducationalAssetRegistration } from "./asset-registration-recovery.ts";

const expected = {
  byteSize: 12345,
  contentType: "application/pdf",
  sha256Hex: "1".repeat(64),
  storagePath: "educational/00000000-0000-4000-8000-000000000001.pdf",
};
const stored = {
  byte_size: expected.byteSize,
  content_type: expected.contentType,
  sha256_hex: expected.sha256Hex,
  storage_path: expected.storagePath,
};

test("missing row leaves the original upload available for retrying registration", () => {
  assert.equal(inspectEducationalAssetRegistration([], expected), "not_registered");
});

test("exact persisted match confirms success after a transport failure", () => {
  assert.equal(inspectEducationalAssetRegistration([stored], expected), "registered");
});

test("a different uploaded body, size, MIME or path cannot be mistaken for success", () => {
  for (const modified of [
    { byte_size: 12346 },
    { content_type: "image/png" },
    { sha256_hex: "2".repeat(64) },
    { storage_path: "educational/a-different-object.pdf" },
  ]) {
    assert.equal(inspectEducationalAssetRegistration([{ ...stored, ...modified }], expected), "conflict");
  }
});

test("multiple rows with the exact row remain an acknowledged registration", () => {
  assert.equal(inspectEducationalAssetRegistration([ {...stored, storage_path: "other"}, stored ], expected), "registered");
});
