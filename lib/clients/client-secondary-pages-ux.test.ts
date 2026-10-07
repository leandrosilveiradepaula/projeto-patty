import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client profile stays focused on account and current registration", () => {
  const page = read("app/cliente/perfil/page.tsx");

  assert.match(page, /title="Acesso à conta"/);
  assert.match(page, /title="Cadastro atual"/);
  assert.doesNotMatch(page, /title="Anamnese"/);
  assert.doesNotMatch(page, /href="\/cliente\/anamnese"/);
});

test("client files relies on persistent navigation instead of a redundant back action", () => {
  const page = read("app/cliente/arquivos/page.tsx");
  const css = read("app/cliente/arquivos/page.module.css");

  assert.doesNotMatch(page, /Voltar ao início/);
  assert.doesNotMatch(page, /primaryAction=/);
  assert.match(page, /href=\{\`\/cliente\/arquivos\/\$\{file\.id\}\`\}/);
  assert.doesNotMatch(css, /\.backLink/);
});
