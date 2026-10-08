import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../../app/admin/clientes/[clienteId]/page.tsx", import.meta.url), "utf8");
const clientsPage = readFileSync(new URL("../../app/admin/clientes/page.tsx", import.meta.url), "utf8");

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


test("linked identity is not presented as completed access", () => {
  assert.match(page, /Identidade vinculada/);
  assert.doesNotMatch(page, /client\.profile_id \? "Concluído" : "Pendente"/);
});

test("clients list does not claim invitation delivery or conflate identity with account", () => {
  assert.match(clientsPage, /Solicitação de convite registrada/);
  assert.match(clientsPage, /A entrega do email e a ativação ainda não foram verificadas/);
  assert.match(clientsPage, /Identidade de acesso não vinculada/);
  assert.doesNotMatch(clientsPage, /Convite enviado/);
  assert.doesNotMatch(clientsPage, /Conta da cliente ainda não vinculada/);
});
