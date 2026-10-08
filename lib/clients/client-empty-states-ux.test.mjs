import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("empty private files points to the real upload section", () => {
  const page = read("app/cliente/arquivos/page.tsx");
  assert.match(page, /id="enviar-arquivo"/);
  assert.match(page, /href="#enviar-arquivo"/);
  assert.match(page, /Nenhum arquivo disponível/);
});

test("empty assessments offer navigation without implying evaluation publication", () => {
  const page = read("app/cliente/avaliacoes/page.tsx");
  assert.match(page, /Quando a Patty publicar esses registros/);
  assert.match(page, /href="\/cliente\/mais"/);
});

test("empty evolution links to factual assessments", () => {
  const page = read("app/cliente/evolucao/page.tsx");
  assert.match(page, /medidas comparáveis/);
  assert.match(page, /href="\/cliente\/avaliacoes"/);
});

test("no published protocol does not imply publication or editing", () => {
  const page = read("app/cliente/protocolo/page.tsx");
  assert.match(page, /ainda não liberou um protocolo/);
  assert.match(page, /href="\/cliente"/);
});
