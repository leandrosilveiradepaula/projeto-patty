import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("file history cards avoid repeating the same category twice", () => {
  const clientPage = read("app/cliente/arquivos/page.tsx");
  const adminPage = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");

  assert.doesNotMatch(clientPage, /className=\{styles\.fileKind\}/);
  assert.doesNotMatch(adminPage, /className=\{styles\.fileKind\}/);
  assert.match(clientPage, /<Badge variant="neutral">/);
  assert.match(adminPage, /<Badge variant="neutral">/);
  assert.doesNotMatch(adminPage, /action=\{<Badge variant="neutral">\{files\.length\} arquivo\(s\)<\/Badge>\}/);
});
