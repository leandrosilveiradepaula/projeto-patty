import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVATE_FILE_LIMITS_BYTES,
  buildPrivateFileObjectPath,
  validatePrivateFile,
} from "./private-files.ts";

test("accepts allowed photo types within the 10 MB limit", () => {
  assert.deepEqual(
    validatePrivateFile({
      byteSize: PRIVATE_FILE_LIMITS_BYTES.photo,
      detectedMimeType: "image/jpeg",
      extension: ".JPG",
      fileKind: "photo",
    }),
    {
      ok: true,
      normalizedExtension: "jpg",
      normalizedMimeType: "image/jpeg",
    },
  );

  assert.equal(
    validatePrivateFile({
      byteSize: 512,
      detectedMimeType: "image/webp",
      extension: "webp",
      fileKind: "photo",
    }).ok,
    true,
  );
});

test("accepts allowed exam and document types within the 20 MB limit", () => {
  assert.equal(
    validatePrivateFile({
      byteSize: PRIVATE_FILE_LIMITS_BYTES.exam,
      detectedMimeType: "application/pdf",
      extension: "pdf",
      fileKind: "exam",
    }).ok,
    true,
  );

  assert.equal(
    validatePrivateFile({
      byteSize: PRIVATE_FILE_LIMITS_BYTES.document,
      detectedMimeType: "image/png",
      extension: "png",
      fileKind: "document",
    }).ok,
    true,
  );
});

test("rejects blocked extensions", () => {
  assert.deepEqual(
    validatePrivateFile({
      byteSize: 1024,
      detectedMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
      fileKind: "document",
    }),
    { ok: false, error: "invalid_extension" },
  );
});

test("rejects MIME types outside the allowlist", () => {
  assert.deepEqual(
    validatePrivateFile({
      byteSize: 1024,
      detectedMimeType: "application/octet-stream",
      extension: "pdf",
      fileKind: "document",
    }),
    { ok: false, error: "invalid_mime_type" },
  );
});

test("rejects extension and detected MIME mismatch", () => {
  assert.deepEqual(
    validatePrivateFile({
      byteSize: 1024,
      detectedMimeType: "image/png",
      extension: "pdf",
      fileKind: "exam",
    }),
    { ok: false, error: "extension_mime_mismatch" },
  );
});

test("rejects zero, unsafe, and oversized files", () => {
  assert.deepEqual(
    validatePrivateFile({
      byteSize: 0,
      detectedMimeType: "image/jpeg",
      extension: "jpg",
      fileKind: "photo",
    }),
    { ok: false, error: "invalid_size" },
  );

  assert.deepEqual(
    validatePrivateFile({
      byteSize: PRIVATE_FILE_LIMITS_BYTES.photo + 1,
      detectedMimeType: "image/jpeg",
      extension: "jpg",
      fileKind: "photo",
    }),
    { ok: false, error: "invalid_size" },
  );

  assert.deepEqual(
    validatePrivateFile({
      byteSize: Number.MAX_SAFE_INTEGER + 1,
      detectedMimeType: "application/pdf",
      extension: "pdf",
      fileKind: "document",
    }),
    { ok: false, error: "invalid_size" },
  );
});

test("builds a PII-free object path from internal UUIDs", () => {
  assert.equal(
    buildPrivateFileObjectPath({
      clientId: "11111111-1111-4111-8111-111111111111",
      extension: ".PNG",
      fileId: "22222222-2222-4222-8222-222222222222",
      fileKind: "photo",
    }),
    "clients/11111111-1111-4111-8111-111111111111/photo/22222222-2222-4222-8222-222222222222.png",
  );
});

test("rejects non-internal identifiers and invalid path extensions", () => {
  assert.throws(
    () =>
      buildPrivateFileObjectPath({
        clientId: "patty@example.com",
        extension: "pdf",
        fileId: "22222222-2222-4222-8222-222222222222",
        fileKind: "document",
      }),
    /Invalid internal identifier/,
  );

  assert.throws(
    () =>
      buildPrivateFileObjectPath({
        clientId: "11111111-1111-4111-8111-111111111111",
        extension: "zip",
        fileId: "22222222-2222-4222-8222-222222222222",
        fileKind: "document",
      }),
    /Invalid extension/,
  );
});
