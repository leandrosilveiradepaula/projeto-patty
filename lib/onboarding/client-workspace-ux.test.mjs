import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../../app/admin/clientes/[clienteId]/page.tsx", import.meta.url), "utf8");

test("linked profile is not misrepresented as activated account", () => {
  assert.match(page, /ativação, a senha e a capacidade de login não são verificadas/);
  assert.doesNotMatch(page, /Conta vinculada e pronta para acesso/);
});

test("invitation request is not misrepresented as delivered email", () => {
  assert.match(page, /A entrega do email e a ativação ainda não foram verificadas/);
  assert.doesNotMatch(page, /convite de ativação foi enviado/);
});

test("manual link flow does not invite duplicate account creation", () => {
  assert.match(page, /não gere outro cadastro/);
});
