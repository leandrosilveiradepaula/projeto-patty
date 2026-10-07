import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("educational content library supports search and lifecycle filtering", () => {
  const page = read("app/admin/conteudos/page.tsx");
  assert.match(page, /searchParams: Promise<\{ q\?: string; status\?: string \}>/);
  assert.match(page, /normalizeSearchValue/);
  assert.match(page, /filteredContents/);
  assert.match(page, /value="draft">Rascunhos/);
  assert.match(page, /value="published">Publicados/);
  assert.match(page, /Nenhum conteúdo encontrado/);
});

test("exercise library supports search and lifecycle filtering", () => {
  const page = read("app/admin/exercicios/page.tsx");
  assert.match(page, /searchParams: Promise<\{ q\?: string; status\?: string \}>/);
  assert.match(page, /normalizeSearchValue/);
  assert.match(page, /filteredExercises/);
  assert.match(page, /value="draft">Rascunhos/);
  assert.match(page, /value="published">Publicados/);
  assert.match(page, /Nenhum exercício encontrado/);
});
