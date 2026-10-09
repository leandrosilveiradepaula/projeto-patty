import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = readFileSync(new URL("../../lib/validation/private-files.ts", import.meta.url), "utf8");
const registration = readFileSync(new URL("../../lib/clients/registration.ts", import.meta.url), "utf8");

test("private file validation rejects unknown kinds before reading allowlist", () => {
  assert.match(files, /hasOwnProperty\.call\(PRIVATE_FILE_ALLOWLIST, input\.fileKind\)/);
});

test("private file validation rejects non-string extension and MIME", () => {
  assert.match(files, /typeof input\.extension !== "string"/);
  assert.match(files, /typeof input\.detectedMimeType !== "string"/);
});

test("private path builder validates file kind and extension type", () => {
  assert.match(files, /throw new Error\("Invalid private file kind"\)/);
  assert.match(files, /throw new Error\("Invalid extension for private file path"\)/);
});

test("optional registration fields reject non-string values rather than clearing existing data", () => {
  assert.match(registration, /if \(value === null\)/);
  assert.match(registration, /throw new Error\("invalid_type"\)/);
});

test("invalid registration field types return a useful error", () => {
  assert.match(registration, /Um dos campos do cadastro é inválido ou ultrapassa o limite permitido/);
});
