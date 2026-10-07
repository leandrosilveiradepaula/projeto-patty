import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("product docs do not reopen technical recovery of access as missing", () => {
  const product = read("docs/PRODUCT.md");
  assert.match(product, /recuperacao de acesso ja possui fluxo tecnico/);
  assert.doesNotMatch(
    product,
    /expiracao\/reenvio do convite, recuperacao de acesso, encerramento da conta/,
  );
});

test("content library reflects the current fail-closed migration state", () => {
  const content = read("docs/CONTENT_LIBRARY.md");
  assert.match(content, /ESTADO OPERACIONAL RECONCILIADO 2026-10-07/);
  assert.match(content, /Nenhum upload Blob, registro de asset, publicacao ou release foi executado/);
  assert.match(content, /lote permanece fail-closed/);
});

test("readiness separates deterministic helpers from automatic professional protocol generation", () => {
  const readiness = read("docs/MVP_READINESS.md");
  assert.match(readiness, /Boundary de automacao de protocolo 2026-10-07/);
  assert.match(readiness, /nao autoriza gerar automaticamente um protocolo completo/);
  assert.match(readiness, /revisao e publicacao humanas obrigatorias/);
});
