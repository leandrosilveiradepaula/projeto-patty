import assert from "node:assert/strict";
import test from "node:test";
import { validatePrivateFileUploadSelection } from "./private-file-upload-selection.ts";

test("preflight accepts valid photos and PDFs with normalized extension and MIME", () => {
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: " imagem.JPG ", size: 1200, type: "IMAGE/JPEG" }, "photo"),
    {
      ok: true,
      byteSize: 1200,
      claimedMimeType: "image/jpeg",
      extension: "jpg",
      originalFilename: "imagem.JPG",
    },
  );
  assert.equal(
    validatePrivateFileUploadSelection({ name: "exame.pdf", size: 1000, type: "application/pdf" }, "exam").ok,
    true,
  );
});

test("empty and missing selections fail before requesting a server upload session", () => {
  assert.deepEqual(validatePrivateFileUploadSelection(null, "photo"), { ok: false, error: "missing_file" });
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: "foto.png", size: 0, type: "image/png" }, "photo"),
    { ok: false, error: "missing_file" },
  );
});

test("preflight rejects invalid names, unsupported formats, and extension/MIME mismatches", () => {
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: " ", size: 120, type: "image/png" }, "photo"),
    { ok: false, error: "invalid_original_filename" },
  );
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: "a".repeat(252) + ".png", size: 120, type: "image/png" }, "photo"),
    { ok: false, error: "invalid_original_filename" },
  );
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: "foto.pdf", size: 120, type: "application/pdf" }, "photo"),
    { ok: false, error: "invalid_extension" },
  );
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: "foto.jpg", size: 120, type: "image/png" }, "photo"),
    { ok: false, error: "extension_mime_mismatch" },
  );
});

test("preflight uses the same technical limits as the authoritative server validator", () => {
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: "foto.png", size: 10 * 1024 * 1024 + 1, type: "image/png" }, "photo"),
    { ok: false, error: "invalid_size" },
  );
  assert.equal(
    validatePrivateFileUploadSelection({ name: "exame.pdf", size: 20 * 1024 * 1024, type: "application/pdf" }, "exam").ok,
    true,
  );
  assert.deepEqual(
    validatePrivateFileUploadSelection({ name: "exame.pdf", size: 20 * 1024 * 1024 + 1, type: "application/pdf" }, "exam"),
    { ok: false, error: "invalid_size" },
  );
});
